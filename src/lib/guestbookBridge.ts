import {
  openJsonPacket,
  sealBinaryFrame,
  sealJsonPacket,
} from './wireCodec';

export interface GuestbookPhotoEntry {
  id: string;
  orderNumber: number;
  imageDataUrl: string;
  message: string;
  author: string;
  filter?: string;
  grayscale: boolean;
  createdAt: string;
  syncStatus: 'synced' | 'local';
}

export interface GuestbookSubmitResult {
  entry: GuestbookPhotoEntry;
  remoteSynced: boolean;
  remoteError?: string;
}

interface WireEntry {
  i: string;
  o?: number;
  u?: string;
  m?: string;
  f?: string;
  c: string;
}

const STORAGE_KEY = '_s1';
const API_ENDPOINT = '/api/s';
const MAX_LOCAL_ENTRIES = 18;

export function getGuestbookIntegrationConfig(): {
  apiUrl: string;
  returnUrl: string | null;
  isEmbedded: boolean;
} {
  return { apiUrl: API_ENDPOINT, returnUrl: null, isEmbedded: false };
}

export function loadLocalGuestbookEntries(): GuestbookPhotoEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is GuestbookPhotoEntry =>
        item &&
        typeof item.id === 'string' &&
        typeof item.imageDataUrl === 'string' &&
        typeof item.createdAt === 'string'
    );
  } catch {
    return [];
  }
}

function saveLocalGuestbookEntries(entries: GuestbookPhotoEntry[]): void {
  if (typeof window === 'undefined') return;
  let list = entries.slice(0, MAX_LOCAL_ENTRIES);
  while (list.length > 0) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return;
    } catch {
      list = list.slice(0, list.length - 1);
    }
  }
}

export async function fetchGuestbookEntries(): Promise<{
  entries: GuestbookPhotoEntry[];
  nextNumber: number;
}> {
  const local = loadLocalGuestbookEntries();
  const assignFallbackNumbers = (list: GuestbookPhotoEntry[]) => {
    const asc = [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    let maxNum = 0;
    const out = asc.map((item, idx) => {
      const n =
        typeof item.orderNumber === 'number' && item.orderNumber > 0
          ? item.orderNumber
          : idx + 1;
      if (n > maxNum) maxNum = n;
      return { ...item, orderNumber: n };
    });
    return { entries: out.reverse(), nextNumber: maxNum + 1 };
  };

  try {
    const res = await fetch(API_ENDPOINT, { cache: 'no-store' });
    if (!res.ok) return assignFallbackNumbers(local);
    const buf = await res.arrayBuffer();
    const data = await openJsonPacket<{ e?: WireEntry[]; n?: number }>(buf);

    if (!data || !Array.isArray(data.e)) return assignFallbackNumbers(local);

    const remote: GuestbookPhotoEntry[] = data.e
      .filter((e) => e && e.i && e.u && e.c)
      .map((e, idx, arr) => ({
        id: e.i,
        orderNumber:
          typeof e.o === 'number' && e.o > 0 ? e.o : arr.length - idx,
        imageDataUrl: e.u || '',
        message: e.m || '',
        author: '',
        filter: e.f || 'kinetic',
        grayscale: false,
        createdAt: e.c,
        syncStatus: 'synced' as const,
      }));

    const remoteIds = new Set(remote.map((r) => r.id));
    const localOnly = local.filter(
      (item) => item.syncStatus === 'local' && !remoteIds.has(item.id)
    );
    const merged = [...remote, ...localOnly].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    saveLocalGuestbookEntries(merged);

    const maxOrder = merged.reduce((m, e) => Math.max(m, e.orderNumber || 0), 0);
    const nextNumber = Math.max(data.n || 1, maxOrder + 1);
    return { entries: merged, nextNumber };
  } catch {
    return assignFallbackNumbers(local);
  }
}

export async function sendFrame(canvas: HTMLCanvasElement): Promise<void> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.82)
  );
  if (!blob) return;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const sealed = await sealBinaryFrame(bytes);
  await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: sealed,
  });
}

export function createArchiveThumbnailDataUrl(
  fullCanvas: HTMLCanvasElement,
  targetWidth = 800,
  quality = 0.84
): string {
  const ratio = fullCanvas.height / (fullCanvas.width || 1);
  const w = targetWidth;
  const h = Math.round(w * ratio);
  const thumb = document.createElement('canvas');
  thumb.width = w;
  thumb.height = h;
  const ctx = thumb.getContext('2d');
  if (!ctx) return fullCanvas.toDataURL('image/jpeg', 0.8);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fullCanvas, 0, 0, w, h);
  return thumb.toDataURL('image/jpeg', quality);
}

export async function submitPhotoToGuestbook(params: {
  fullCanvas: HTMLCanvasElement;
  message: string;
  author: string;
  orderNumber: number;
  filter?: string;
  grayscale: boolean;
}): Promise<GuestbookSubmitResult> {
  const {
    fullCanvas,
    message,
    author,
    orderNumber,
    filter = 'kinetic',
    grayscale,
  } = params;
  const createdAt = new Date().toISOString();
  const id = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const fullJpegDataUrl = fullCanvas.toDataURL('image/jpeg', 0.9);
  const archiveThumbDataUrl = createArchiveThumbnailDataUrl(fullCanvas, 800, 0.84);

  let remoteSynced = false;
  let remoteError: string | undefined;
  let finalImageUrl = archiveThumbDataUrl;
  let finalOrderNumber = orderNumber;

  try {
    const sealed = await sealJsonPacket({
      i: id,
      o: orderNumber,
      d: fullJpegDataUrl,
      m: message.trim(),
      f: filter,
      c: createdAt,
    });
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: sealed,
    });
    if (res.ok) {
      remoteSynced = true;
      const buf = await res.arrayBuffer();
      const payload = await openJsonPacket<{ e?: WireEntry }>(buf);
      if (payload?.e?.u) {
        finalImageUrl = payload.e.u;
      }
      if (payload?.e?.o) {
        finalOrderNumber = payload.e.o;
      }
    } else {
      remoteError = `${res.status}`;
    }
  } catch {
    remoteError = 'err';
  }

  const entry: GuestbookPhotoEntry = {
    id,
    orderNumber: finalOrderNumber,
    imageDataUrl: finalImageUrl,
    message: message.trim(),
    author: author.trim(),
    filter,
    grayscale,
    createdAt,
    syncStatus: remoteSynced ? 'synced' : 'local',
  };

  if (!remoteSynced) {
    const existing = loadLocalGuestbookEntries();
    saveLocalGuestbookEntries([entry, ...existing]);
  }

  return { entry, remoteSynced, remoteError };
}

export function formatKoreaDate(isoOrDate: string | Date = new Date()): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename = `photo-${Date.now()}.png`
): void {
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function shareCanvasImage(
  canvas: HTMLCanvasElement,
  message: string
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) return false;
  try {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );
    if (!blob) return false;
    const file = new File([blob], 'photo.png', { type: 'image/png' });
    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      return false;
    }
    await navigator.share({
      title: '⟪공과 주⟫ 포토 방명록',
      text: message.trim() || 'ownhomeown.com',
      files: [file],
    });
    return true;
  } catch {
    return false;
  }
}

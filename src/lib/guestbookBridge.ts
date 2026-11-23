export interface GuestbookPhotoEntry {
  id: string;
  /** Framed 1080x1920 (or compressed archive JPEG) data URL */
  imageDataUrl: string;
  /** Visitor guestbook message */
  message: string;
  /** Visitor display name / nickname */
  author: string;
  /** Whether monochrome filter was used */
  grayscale: boolean;
  /** ISO timestamp */
  createdAt: string;
  /** Sync status with external guestbook site/API */
  syncStatus: 'synced' | 'local';
}

export interface GuestbookSubmitResult {
  entry: GuestbookPhotoEntry;
  remoteSynced: boolean;
  remoteError?: string;
}

const STORAGE_KEY = 'ownhomeown:photo-guestbook:v1';
const MAX_LOCAL_ENTRIES = 18;

/** Reads optional ?returnUrl=... or ?api=... query parameters safely */
export function getGuestbookIntegrationConfig(): {
  apiUrl: string | null;
  returnUrl: string | null;
  isEmbedded: boolean;
} {
  if (typeof window === 'undefined') {
    return { apiUrl: null, returnUrl: null, isEmbedded: false };
  }

  const params = new URLSearchParams(window.location.search);
  const envApi = (import.meta.env.VITE_GUESTBOOK_API_URL as string | undefined)?.trim();
  const queryApi = params.get('api')?.trim();
  const rawApi = queryApi || envApi || '';

  const envReturn = (import.meta.env.VITE_GUESTBOOK_RETURN_URL as string | undefined)?.trim();
  const queryReturn = params.get('returnUrl')?.trim();
  const rawReturn = queryReturn || envReturn || '';

  const safeHttpUrl = (candidate: string): string | null => {
    if (!candidate) return null;
    try {
      const parsed = new URL(candidate, window.location.origin);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.toString();
      }
    } catch {
      return null;
    }
    return null;
  };

  let isEmbedded = false;
  try {
    isEmbedded = window.self !== window.top || Boolean(window.opener);
  } catch {
    isEmbedded = true;
  }

  return {
    apiUrl: safeHttpUrl(rawApi),
    returnUrl: safeHttpUrl(rawReturn),
    isEmbedded,
  };
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
      // Trim oldest entry if localStorage quota is tight
      list = list.slice(0, list.length - 1);
    }
  }
}

export function deleteLocalGuestbookEntry(id: string): GuestbookPhotoEntry[] {
  const next = loadLocalGuestbookEntries().filter((e) => e.id !== id);
  saveLocalGuestbookEntries(next);
  return next;
}

/** Downscales a 1600x1200 (4:3) canvas to a compact JPEG for reliable localStorage archival */
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

/**
 * Submits a framed 1-cut photo + guestbook message:
 * 1. Sends to external guestbook API if configured (`VITE_GUESTBOOK_API_URL` or `?api=...`)
 * 2. Broadcasts `OWNHOMEOWN_PHOTO_GUESTBOOK_SUBMIT` via `postMessage` to parent/opener guestbook window
 * 3. Persists a compressed card locally so it immediately appears in the /photo guestbook archive
 */
export async function submitPhotoToGuestbook(params: {
  fullCanvas: HTMLCanvasElement;
  message: string;
  author: string;
  grayscale: boolean;
}): Promise<GuestbookSubmitResult> {
  const { fullCanvas, message, author, grayscale } = params;
  const createdAt = new Date().toISOString();
  const id = `oho-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const fullJpegDataUrl = fullCanvas.toDataURL('image/jpeg', 0.92);
  const archiveThumbDataUrl = createArchiveThumbnailDataUrl(fullCanvas, 800, 0.84);
  const config = getGuestbookIntegrationConfig();

  let remoteSynced = false;
  let remoteError: string | undefined;

  if (config.apiUrl) {
    try {
      const res = await fetch(config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          imageDataUrl: fullJpegDataUrl,
          message: message.trim(),
          author: author.trim() || '익명',
          grayscale,
          createdAt,
          source: 'ownhomeown.com/photo',
        }),
      });
      if (res.ok) {
        remoteSynced = true;
      } else {
        remoteError = `HTTP ${res.status}`;
      }
    } catch (err) {
      remoteError = err instanceof Error ? err.message : 'Network error';
    }
  }

  // Notify parent iframe or opener guestbook site if connected
  const postPayload = {
    type: 'OWNHOMEOWN_PHOTO_GUESTBOOK_SUBMIT',
    payload: {
      id,
      imageDataUrl: fullJpegDataUrl,
      message: message.trim(),
      author: author.trim() || '익명',
      grayscale,
      createdAt,
      source: 'ownhomeown.com/photo',
    },
  };

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(postPayload, '*');
      remoteSynced = true;
    }
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(postPayload, '*');
      remoteSynced = true;
    }
  } catch {
    // Ignore cross-origin postMessage restrictions
  }

  const entry: GuestbookPhotoEntry = {
    id,
    imageDataUrl: archiveThumbDataUrl,
    message: message.trim(),
    author: author.trim() || '익명',
    grayscale,
    createdAt,
    syncStatus: remoteSynced ? 'synced' : 'local',
  };

  const existing = loadLocalGuestbookEntries();
  saveLocalGuestbookEntries([entry, ...existing]);

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
  filename = `ownhomeown-photo-${Date.now()}.png`
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
    const file = new File([blob], 'ownhomeown-photo.png', { type: 'image/png' });
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

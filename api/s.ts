import { del, get, list, put } from '@vercel/blob';
import { randomBytes, timingSafeEqual } from 'node:crypto';

interface StoredGuestbookEntry {
  id: string;
  orderNumber: number;
  imageUrl: string;
  imagePathname?: string;
  message: string;
  filter: string;
  createdAt: string;
}

interface StoredGuestbookIndex {
  entries: StoredGuestbookEntry[];
  nextNumber: number;
  updatedAt: string;
}

interface WireEntry {
  i: string;
  o: number;
  u: string;
  m: string;
  f: string;
  c: string;
}

const ENTRY_PREFIX = 'photo-guestbook/entries/';
const IMAGE_PREFIX = 'photo-guestbook/images/';
const TIMELAPSE_PREFIX = 'photo-timelapse/2026-11-27/';
const INDEX_PATHNAME = 'photo-guestbook/index-v1.json';
const MAX_ENTRIES_RETURNED = 500;
const SEED = 0x7a3c9e15;

let memoryIndexCache: StoredGuestbookIndex | null = null;
let storeAccessMode: 'unknown' | 'private' | 'public' = 'unknown';

function nextMask(state: number): number {
  let x = state | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}

function xorBuffer(input: Uint8Array, salt: Uint8Array): Buffer {
  let state =
    (SEED ^
      ((salt[0] << 24) | (salt[1] << 16) | (salt[2] << 8) | salt[3])) >>>
    0;
  if (state === 0) state = SEED;

  const out = Buffer.allocUnsafe(input.length);
  for (let i = 0; i < input.length; i++) {
    if ((i & 3) === 0) {
      state = nextMask(state);
    }
    const keyByte = (state >>> ((i & 3) * 8)) & 0xff;
    out[i] = input[i] ^ keyByte;
  }
  return out;
}

function encodeWire(payload: unknown): string {
  const raw = Buffer.from(JSON.stringify(payload), 'utf8');
  const salt = randomBytes(4);
  const masked = xorBuffer(raw, salt);
  return Buffer.concat([salt, masked]).toString('base64');
}

function decodeWire<T>(encoded: string): T | null {
  try {
    const trimmed = encoded.trim();
    if (!trimmed) return null;
    const combined = Buffer.from(trimmed, 'base64');
    if (combined.length < 5) return null;
    const salt = combined.subarray(0, 4);
    const masked = combined.subarray(4);
    const plain = xorBuffer(masked, salt);
    return JSON.parse(plain.toString('utf8')) as T;
  } catch {
    return null;
  }
}

function encodeResourceToken(pathname: string): string {
  const raw = Buffer.from(pathname, 'utf8');
  const salt = Buffer.from([0x31, 0x7a, 0xc4, 0x19]);
  const masked = xorBuffer(raw, salt);
  return masked.toString('base64url');
}

function decodeResourceToken(token: string): string | null {
  try {
    if (!token || token.length > 256) return null;
    const masked = Buffer.from(token, 'base64url');
    const salt = Buffer.from([0x31, 0x7a, 0xc4, 0x19]);
    return xorBuffer(masked, salt).toString('utf8');
  } catch {
    return null;
  }
}

function opaqueResponse(payload: unknown, status = 200): Response {
  return new Response(encodeWire(payload), {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}

function emptyError(status: number): Response {
  return new Response('', {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const reqUrl = new URL(request.url);
    const originUrl = new URL(origin);
    if (originUrl.host === reqUrl.host) return true;
    if (
      originUrl.hostname === 'localhost' ||
      originUrl.hostname === '127.0.0.1'
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function hasBlobStorage(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID
  );
}

function normalizeImageUrl(entry: StoredGuestbookEntry): string {
  if (entry.imagePathname && entry.imageUrl.startsWith('/api/')) {
    return `/api/s?r=${encodeResourceToken(entry.imagePathname)}`;
  }
  const legacyMatch = entry.imageUrl.match(/[?&]image=([^&]+)/);
  if (legacyMatch) {
    try {
      const decodedPath = decodeURIComponent(legacyMatch[1]);
      if (decodedPath.startsWith(IMAGE_PREFIX) && !decodedPath.includes('..')) {
        return `/api/s?r=${encodeResourceToken(decodedPath)}`;
      }
    } catch {
      // fall through
    }
  }
  return entry.imageUrl;
}

function toWireEntry(entry: StoredGuestbookEntry): WireEntry {
  return {
    i: entry.id,
    o: entry.orderNumber,
    u: normalizeImageUrl(entry),
    m: entry.message,
    f: entry.filter,
    c: entry.createdAt,
  };
}

async function putAutoAccess(
  pathname: string,
  body: Buffer | string,
  contentType: string
): Promise<{ url: string; pathname: string; access: 'public' | 'private' }> {
  if (storeAccessMode === 'private') {
    const blob = await put(pathname, body, {
      access: 'private',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { url: blob.url, pathname: blob.pathname, access: 'private' };
  }

  try {
    const blob = await put(pathname, body, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    storeAccessMode = 'public';
    return { url: blob.url, pathname: blob.pathname, access: 'public' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/private/i.test(msg) || /access/i.test(msg)) {
      storeAccessMode = 'private';
      const blob = await put(pathname, body, {
        access: 'private',
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return { url: blob.url, pathname: blob.pathname, access: 'private' };
    }
    throw err;
  }
}

async function readJsonBlob<T = Partial<StoredGuestbookEntry>>(
  url: string,
  pathname: string
): Promise<T | null> {
  if (storeAccessMode !== 'public') {
    try {
      const result = await get(pathname, { access: 'private' });
      if (result && result.statusCode === 200 && result.stream) {
        storeAccessMode = 'private';
        const text = await new Response(result.stream).text();
        return JSON.parse(text) as T;
      }
    } catch {
      // Fall through to public fetch
    }
  }

  if (url) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        storeAccessMode = 'public';
        return (await res.json()) as T;
      }
    } catch {
      return null;
    }
  }
  return null;
}

async function getOrBuildGuestbookIndex(): Promise<StoredGuestbookIndex> {
  if (memoryIndexCache) {
    return memoryIndexCache;
  }

  const existingIndex = await readJsonBlob<StoredGuestbookIndex>(
    '',
    INDEX_PATHNAME
  );
  if (
    existingIndex &&
    Array.isArray(existingIndex.entries) &&
    typeof existingIndex.nextNumber === 'number'
  ) {
    memoryIndexCache = existingIndex;
    return existingIndex;
  }

  const { blobs } = await list({
    prefix: ENTRY_PREFIX,
    limit: MAX_ENTRIES_RETURNED,
  });

  const sortedBlobs = [...blobs].sort(
    (a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );

  const fetched = await Promise.all(
    sortedBlobs.map(
      async (blob): Promise<Partial<StoredGuestbookEntry> | null> => {
        const data = await readJsonBlob<Partial<StoredGuestbookEntry>>(
          blob.url,
          blob.pathname
        );
        if (!data || !data.id || !data.imageUrl || !data.createdAt) return null;
        return data;
      }
    )
  );

  const chronological = fetched
    .filter((item): item is Partial<StoredGuestbookEntry> => item !== null)
    .sort(
      (a, b) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
    );

  let maxNum = 0;
  const numbered: StoredGuestbookEntry[] = chronological.map((data, idx) => {
    const assigned =
      typeof data.orderNumber === 'number' && data.orderNumber > 0
        ? Math.floor(data.orderNumber)
        : idx + 1;
    if (assigned > maxNum) maxNum = assigned;
    return {
      id: data.id!,
      orderNumber: assigned,
      imageUrl: data.imageUrl!,
      imagePathname: data.imagePathname,
      message: typeof data.message === 'string' ? data.message : '',
      filter: typeof data.filter === 'string' ? data.filter : 'kinetic',
      createdAt: data.createdAt!,
    };
  });

  const built: StoredGuestbookIndex = {
    entries: numbered.reverse(),
    nextNumber: maxNum + 1,
    updatedAt: new Date().toISOString(),
  };

  memoryIndexCache = built;
  void putAutoAccess(
    INDEX_PATHNAME,
    JSON.stringify(built),
    'application/json; charset=utf-8'
  ).catch(() => {});

  return built;
}

export async function GET(request: Request): Promise<Response> {
  if (!hasBlobStorage()) {
    return emptyError(503);
  }

  const url = new URL(request.url);
  const resourceToken = url.searchParams.get('r')?.trim();

  if (resourceToken) {
    const imagePathname = decodeResourceToken(resourceToken);
    if (
      !imagePathname ||
      !imagePathname.startsWith(IMAGE_PREFIX) ||
      imagePathname.includes('..')
    ) {
      return emptyError(400);
    }
    try {
      const result = await get(imagePathname, { access: 'private' });
      if (!result || result.statusCode !== 200 || !result.stream) {
        return emptyError(404);
      }
      return new Response(result.stream, {
        status: 200,
        headers: {
          'Content-Type': result.blob.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
          'X-Robots-Tag': 'noindex, nofollow, noarchive',
        },
      });
    } catch {
      return emptyError(500);
    }
  }

  try {
    const index = await getOrBuildGuestbookIndex();
    return opaqueResponse(
      {
        e: index.entries.map(toWireEntry),
        n: index.nextNumber,
      },
      200
    );
  } catch {
    return emptyError(500);
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!hasBlobStorage()) {
    return emptyError(503);
  }
  if (!isAllowedOrigin(request)) {
    return emptyError(403);
  }

  try {
    const rawText = await request.text();
    const body = decodeWire<{
      t?: number;
      i?: string;
      o?: number;
      d?: string;
      m?: string;
      f?: string;
      c?: string;
    }>(rawText);

    if (!body || typeof body !== 'object') {
      return emptyError(400);
    }

    const imageDataUrl = typeof body.d === 'string' ? body.d : '';
    const match = imageDataUrl.match(
      /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/
    );
    if (!match) {
      return emptyError(400);
    }

    const ext =
      match[1] === 'png' ? 'png' : match[1] === 'webp' ? 'webp' : 'jpg';
    const contentType =
      ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const imageBuffer = Buffer.from(match[2], 'base64');

    if (imageBuffer.byteLength > 3_800_000) {
      return emptyError(413);
    }

    if (body.t === 1) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const rand = Math.random().toString(36).slice(2, 6);
      const pathname = `${TIMELAPSE_PREFIX}rec-${ts}-${rand}.${ext}`;
      await putAutoAccess(pathname, imageBuffer, contentType);
      return opaqueResponse({ s: 1 }, 201);
    }

    const rawId =
      typeof body.i === 'string' && /^[a-zA-Z0-9_-]{4,40}$/.test(body.i)
        ? body.i
        : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const createdAt =
      typeof body.c === 'string' && !Number.isNaN(Date.parse(body.c))
        ? body.c
        : new Date().toISOString();
    const message =
      typeof body.m === 'string' ? body.m.trim().slice(0, 120) : '';
    const filter =
      typeof body.f === 'string' ? body.f.trim().slice(0, 24) : 'kinetic';

    let orderNumber =
      typeof body.o === 'number' && Number.isInteger(body.o) && body.o > 0
        ? body.o
        : 0;

    if (orderNumber === 0) {
      const currentIndex = await getOrBuildGuestbookIndex();
      orderNumber = currentIndex.nextNumber;
    }

    const imageBlob = await putAutoAccess(
      `${IMAGE_PREFIX}${rawId}.${ext}`,
      imageBuffer,
      contentType
    );

    const resolvedImageUrl =
      imageBlob.access === 'private'
        ? `/api/s?r=${encodeResourceToken(imageBlob.pathname)}`
        : imageBlob.url;

    const entry: StoredGuestbookEntry = {
      id: rawId,
      orderNumber,
      imageUrl: resolvedImageUrl,
      imagePathname: imageBlob.pathname,
      message,
      filter,
      createdAt,
    };

    const currentIndex = await getOrBuildGuestbookIndex();
    const updatedEntries = [
      entry,
      ...currentIndex.entries.filter((e) => e.id !== entry.id),
    ].slice(0, MAX_ENTRIES_RETURNED);
    const updatedIndex: StoredGuestbookIndex = {
      entries: updatedEntries,
      nextNumber: Math.max(currentIndex.nextNumber, entry.orderNumber + 1),
      updatedAt: new Date().toISOString(),
    };
    memoryIndexCache = updatedIndex;

    await Promise.all([
      putAutoAccess(
        `${ENTRY_PREFIX}${rawId}.json`,
        JSON.stringify(entry),
        'application/json; charset=utf-8'
      ),
      putAutoAccess(
        INDEX_PATHNAME,
        JSON.stringify(updatedIndex),
        'application/json; charset=utf-8'
      ),
    ]);

    return opaqueResponse({ e: toWireEntry(entry) }, 201);
  } catch {
    return emptyError(500);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!hasBlobStorage()) {
    return emptyError(503);
  }

  const configuredKey = process.env.GUESTBOOK_ADMIN_KEY;
  const providedKey = request.headers.get('x-admin-key') || '';
  if (!configuredKey || !providedKey) {
    return emptyError(403);
  }
  const a = Buffer.from(configuredKey, 'utf8');
  const b = Buffer.from(providedKey, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return emptyError(403);
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('i')?.trim() || '';
    if (!/^[a-zA-Z0-9_-]{4,40}$/.test(id)) {
      return emptyError(400);
    }

    const targets: string[] = [];
    const { blobs: entryBlobs } = await list({ prefix: `${ENTRY_PREFIX}${id}` });
    for (const blob of entryBlobs) targets.push(blob.url);
    const { blobs: imgBlobs } = await list({ prefix: `${IMAGE_PREFIX}${id}` });
    for (const blob of imgBlobs) targets.push(blob.url);

    if (targets.length > 0) {
      await del(targets);
    }

    if (memoryIndexCache) {
      memoryIndexCache = {
        ...memoryIndexCache,
        entries: memoryIndexCache.entries.filter((e) => e.id !== id),
        updatedAt: new Date().toISOString(),
      };
      await putAutoAccess(
        INDEX_PATHNAME,
        JSON.stringify(memoryIndexCache),
        'application/json; charset=utf-8'
      ).catch(() => {});
    }

    return opaqueResponse({ s: 1 }, 200);
  } catch {
    return emptyError(500);
  }
}

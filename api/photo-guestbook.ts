import { del, get, list, put } from '@vercel/blob';

interface StoredGuestbookEntry {
  id: string;
  orderNumber: number;
  imageUrl: string;
  imagePathname?: string;
  message: string;
  filter: string;
  createdAt: string;
}

const ENTRY_PREFIX = 'photo-guestbook/entries/';
const IMAGE_PREFIX = 'photo-guestbook/images/';
const MAX_ENTRIES_RETURNED = 500;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function hasBlobStorage(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID
  );
}

/** Uploads to Vercel Blob supporting both public and private stores automatically */
async function putAutoAccess(
  pathname: string,
  body: Buffer | string,
  contentType: string
): Promise<{ url: string; pathname: string; access: 'public' | 'private' }> {
  try {
    const blob = await put(pathname, body, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { url: blob.url, pathname: blob.pathname, access: 'public' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/private/i.test(msg) || /access/i.test(msg)) {
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

/** Reads a JSON blob from either a public or private Vercel Blob store */
async function readJsonBlob(
  url: string,
  pathname: string
): Promise<Partial<StoredGuestbookEntry> | null> {
  try {
    const res = await fetch(url);
    if (res.ok) {
      return (await res.json()) as Partial<StoredGuestbookEntry>;
    }
  } catch {
    // Fall through to private get()
  }

  try {
    const result = await get(pathname, { access: 'private' });
    if (result && result.statusCode === 200 && result.stream) {
      const text = await new Response(result.stream).text();
      return JSON.parse(text) as Partial<StoredGuestbookEntry>;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * GET /api/photo-guestbook
 * - With ?image=<pathname>: streams a stored private/public guestbook image
 * - Without query: lists recent 4:3 exhibition photo guestbook cards stored in Vercel Blob
 */
export async function GET(request: Request): Promise<Response> {
  if (!hasBlobStorage()) {
    return jsonResponse({ error: 'BLOB_NOT_CONFIGURED', entries: [] }, 503);
  }

  const url = new URL(request.url);
  const imagePathname = url.searchParams.get('image')?.trim();

  // Stream image proxy for private Blob stores
  if (imagePathname) {
    if (
      !imagePathname.startsWith(IMAGE_PREFIX) ||
      imagePathname.includes('..')
    ) {
      return jsonResponse({ error: 'INVALID_IMAGE_PATH' }, 400);
    }
    try {
      const result = await get(imagePathname, { access: 'private' });
      if (!result || result.statusCode !== 200 || !result.stream) {
        return jsonResponse({ error: 'NOT_FOUND' }, 404);
      }
      return new Response(result.stream, {
        status: 200,
        headers: {
          'Content-Type': result.blob.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (err) {
      console.error('[api/photo-guestbook GET image] failed:', err);
      return jsonResponse({ error: 'FAILED_TO_READ_IMAGE' }, 500);
    }
  }

  try {
    const { blobs } = await list({
      prefix: ENTRY_PREFIX,
      limit: MAX_ENTRIES_RETURNED,
    });

    const sortedBlobs = [...blobs].sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    const fetched = await Promise.all(
      sortedBlobs.map(async (blob): Promise<Partial<StoredGuestbookEntry> | null> => {
        const data = await readJsonBlob(blob.url, blob.pathname);
        if (!data || !data.id || !data.imageUrl || !data.createdAt) return null;
        return data;
      })
    );

    // Sort oldest -> newest to assign stable sequential orderNumbers for any legacy entries
    const chronological = fetched
      .filter((item): item is Partial<StoredGuestbookEntry> => item !== null)
      .sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
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

    const entries = numbered.reverse(); // newest first
    const nextNumber = maxNum + 1;

    return jsonResponse({ entries, nextNumber }, 200);
  } catch (err) {
    console.error('[api/photo-guestbook GET] failed:', err);
    return jsonResponse({ error: 'FAILED_TO_LIST', entries: [] }, 500);
  }
}

/**
 * POST /api/photo-guestbook
 * Saves a 1600x1200 framed JPEG and its guestbook metadata JSON into Vercel Blob.
 */
export async function POST(request: Request): Promise<Response> {
  if (!hasBlobStorage()) {
    return jsonResponse({ error: 'BLOB_NOT_CONFIGURED' }, 503);
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      orderNumber?: number;
      imageDataUrl?: string;
      message?: string;
      filter?: string;
      createdAt?: string;
    };

    const imageDataUrl =
      typeof body.imageDataUrl === 'string' ? body.imageDataUrl : '';
    const match = imageDataUrl.match(
      /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/
    );
    if (!match) {
      return jsonResponse({ error: 'INVALID_IMAGE_DATA' }, 400);
    }

    const ext =
      match[1] === 'png' ? 'png' : match[1] === 'webp' ? 'webp' : 'jpg';
    const contentType =
      ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const imageBuffer = Buffer.from(match[2], 'base64');

    if (imageBuffer.byteLength > 3_800_000) {
      return jsonResponse({ error: 'IMAGE_TOO_LARGE' }, 413);
    }

    const rawId =
      typeof body.id === 'string' && /^[a-zA-Z0-9_-]{4,40}$/.test(body.id)
        ? body.id
        : `oho-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const createdAt =
      typeof body.createdAt === 'string' &&
      !Number.isNaN(Date.parse(body.createdAt))
        ? body.createdAt
        : new Date().toISOString();
    const message =
      typeof body.message === 'string' ? body.message.trim().slice(0, 120) : '';
    const filter =
      typeof body.filter === 'string'
        ? body.filter.trim().slice(0, 24)
        : 'kinetic';

    // Determine sequential orderNumber (preserve explicit valid number or assign next)
    let orderNumber =
      typeof body.orderNumber === 'number' &&
      Number.isInteger(body.orderNumber) &&
      body.orderNumber > 0
        ? body.orderNumber
        : 0;

    if (orderNumber === 0) {
      const { blobs: existingBlobs } = await list({
        prefix: ENTRY_PREFIX,
        limit: 1000,
      });
      orderNumber = existingBlobs.length + 1;
    }

    // 1. Upload image binary to Vercel Blob (auto-handles public or private store)
    const imageBlob = await putAutoAccess(
      `${IMAGE_PREFIX}${rawId}.${ext}`,
      imageBuffer,
      contentType
    );

    const resolvedImageUrl =
      imageBlob.access === 'private'
        ? `/api/photo-guestbook?image=${encodeURIComponent(imageBlob.pathname)}`
        : imageBlob.url;

    // 2. Upload entry metadata JSON to Vercel Blob
    const entry: StoredGuestbookEntry = {
      id: rawId,
      orderNumber,
      imageUrl: resolvedImageUrl,
      imagePathname: imageBlob.pathname,
      message,
      filter,
      createdAt,
    };

    await putAutoAccess(
      `${ENTRY_PREFIX}${rawId}.json`,
      JSON.stringify(entry),
      'application/json; charset=utf-8'
    );

    return jsonResponse({ entry }, 201);
  } catch (err) {
    console.error('[api/photo-guestbook POST] failed:', err);
    return jsonResponse(
      {
        error: 'FAILED_TO_SAVE',
        detail: err instanceof Error ? err.message : 'Unknown error',
      },
      500
    );
  }
}

/**
 * DELETE /api/photo-guestbook?id=<entryId>
 * Removes an entry's JSON and image blobs from Vercel Blob.
 */
export async function DELETE(request: Request): Promise<Response> {
  if (!hasBlobStorage()) {
    return jsonResponse({ error: 'BLOB_NOT_CONFIGURED' }, 503);
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id')?.trim() || '';
    if (!/^[a-zA-Z0-9_-]{4,40}$/.test(id)) {
      return jsonResponse({ error: 'INVALID_ID' }, 400);
    }

    const targets: string[] = [];
    const { blobs: entryBlobs } = await list({ prefix: `${ENTRY_PREFIX}${id}` });
    for (const b of entryBlobs) targets.push(b.url);
    const { blobs: imgBlobs } = await list({ prefix: `${IMAGE_PREFIX}${id}` });
    for (const b of imgBlobs) targets.push(b.url);

    if (targets.length > 0) {
      await del(targets);
    }

    return jsonResponse({ deleted: true, id }, 200);
  } catch (err) {
    console.error('[api/photo-guestbook DELETE] failed:', err);
    return jsonResponse({ error: 'FAILED_TO_DELETE' }, 500);
  }
}

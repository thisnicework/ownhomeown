import { del, list, put } from '@vercel/blob';

interface StoredGuestbookEntry {
  id: string;
  imageUrl: string;
  message: string;
  filter: string;
  createdAt: string;
}

const ENTRY_PREFIX = 'photo-guestbook/entries/';
const IMAGE_PREFIX = 'photo-guestbook/images/';
const MAX_ENTRIES_RETURNED = 48;

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

/**
 * GET /api/photo-guestbook
 * Lists recent 4:3 exhibition photo guestbook cards stored in Vercel Blob.
 */
export async function GET(): Promise<Response> {
  if (!hasBlobStorage()) {
    return jsonResponse(
      { error: 'BLOB_NOT_CONFIGURED', entries: [] },
      503
    );
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
      sortedBlobs.map(async (blob): Promise<StoredGuestbookEntry | null> => {
        try {
          const res = await fetch(blob.url);
          if (!res.ok) return null;
          const data = (await res.json()) as Partial<StoredGuestbookEntry>;
          if (!data.id || !data.imageUrl || !data.createdAt) return null;
          return {
            id: data.id,
            imageUrl: data.imageUrl,
            message: typeof data.message === 'string' ? data.message : '',
            filter: typeof data.filter === 'string' ? data.filter : 'kinetic',
            createdAt: data.createdAt,
          };
        } catch {
          return null;
        }
      })
    );

    const entries = fetched
      .filter((item): item is StoredGuestbookEntry => item !== null)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return jsonResponse({ entries }, 200);
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
      imageDataUrl?: string;
      message?: string;
      filter?: string;
      createdAt?: string;
    };

    const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : '';
    const match = imageDataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
    if (!match) {
      return jsonResponse({ error: 'INVALID_IMAGE_DATA' }, 400);
    }

    const ext = match[1] === 'png' ? 'png' : match[1] === 'webp' ? 'webp' : 'jpg';
    const contentType =
      ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const imageBuffer = Buffer.from(match[2], 'base64');

    // Guard against oversized payloads (Vercel Function body cap is 4.5 MB)
    if (imageBuffer.byteLength > 3_800_000) {
      return jsonResponse({ error: 'IMAGE_TOO_LARGE' }, 413);
    }

    const rawId =
      typeof body.id === 'string' && /^[a-zA-Z0-9_-]{4,40}$/.test(body.id)
        ? body.id
        : `oho-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const createdAt =
      typeof body.createdAt === 'string' && !Number.isNaN(Date.parse(body.createdAt))
        ? body.createdAt
        : new Date().toISOString();
    const message =
      typeof body.message === 'string' ? body.message.trim().slice(0, 120) : '';
    const filter =
      typeof body.filter === 'string' ? body.filter.trim().slice(0, 24) : 'kinetic';

    // 1. Upload image binary to Vercel Blob
    const imageBlob = await put(`${IMAGE_PREFIX}${rawId}.${ext}`, imageBuffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });

    // 2. Upload entry metadata JSON to Vercel Blob
    const entry: StoredGuestbookEntry = {
      id: rawId,
      imageUrl: imageBlob.url,
      message,
      filter,
      createdAt,
    };

    await put(`${ENTRY_PREFIX}${rawId}.json`, JSON.stringify(entry), {
      access: 'public',
      contentType: 'application/json; charset=utf-8',
      addRandomSuffix: false,
    });

    return jsonResponse({ entry }, 201);
  } catch (err) {
    console.error('[api/photo-guestbook POST] failed:', err);
    return jsonResponse({ error: 'FAILED_TO_SAVE' }, 500);
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

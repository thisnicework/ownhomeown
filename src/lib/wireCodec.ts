let cachedKeyPromise: Promise<CryptoKey> | null = null;

function deriveRawKey(): Uint8Array {
  const a = [0x91, 0x4e, 0xd3, 0x28, 0x7b, 0x15, 0xc9, 0x62];
  const b = [0x3a, 0x87, 0x54, 0xf1, 0x0d, 0xe6, 0x42, 0x9b];
  const c = [0x6c, 0x21, 0xaf, 0x78, 0x35, 0x8e, 0x14, 0xd7];
  const d = [0x53, 0xbc, 0x09, 0x64, 0xe2, 0x3f, 0x81, 0xaa];
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i] = (a[i] ^ ((i * 29 + 7) & 0xff)) & 0xff;
    out[i + 8] = (b[i] ^ ((i * 43 + 19) & 0xff)) & 0xff;
    out[i + 16] = (c[i] ^ ((i * 61 + 31) & 0xff)) & 0xff;
    out[i + 24] = (d[i] ^ ((i * 73 + 53) & 0xff)) & 0xff;
  }
  return out;
}

function getKey(): Promise<CryptoKey> {
  if (!cachedKeyPromise) {
    const raw = deriveRawKey();
    cachedKeyPromise = crypto.subtle.importKey(
      'raw',
      raw.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }
  return cachedKeyPromise;
}

async function sealBytes(plain: Uint8Array): Promise<ArrayBuffer> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plain.buffer.slice(
        plain.byteOffset,
        plain.byteOffset + plain.byteLength
      ) as ArrayBuffer
    )
  );
  const packet = new Uint8Array(12 + encrypted.length);
  packet.set(iv, 0);
  packet.set(encrypted, 12);
  return packet.buffer;
}

async function openBytes(buffer: ArrayBuffer): Promise<Uint8Array | null> {
  try {
    if (buffer.byteLength < 29) return null;
    const bytes = new Uint8Array(buffer);
    const iv = bytes.subarray(0, 12);
    const body = bytes.subarray(12);
    const key = await getKey();
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      body
    );
    return new Uint8Array(plain);
  } catch {
    return null;
  }
}

export async function sealBinaryFrame(jpegBytes: Uint8Array): Promise<ArrayBuffer> {
  const plain = new Uint8Array(1 + jpegBytes.length);
  plain[0] = 0x01;
  plain.set(jpegBytes, 1);
  return sealBytes(plain);
}

export async function sealJsonPacket(payload: unknown): Promise<ArrayBuffer> {
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const plain = new Uint8Array(1 + encoded.length);
  plain[0] = 0x02;
  plain.set(encoded, 1);
  return sealBytes(plain);
}

export async function openJsonPacket<T>(buffer: ArrayBuffer): Promise<T | null> {
  const plain = await openBytes(buffer);
  if (!plain || plain.length < 2 || plain[0] !== 0x02) return null;
  try {
    return JSON.parse(new TextDecoder().decode(plain.subarray(1))) as T;
  } catch {
    return null;
  }
}

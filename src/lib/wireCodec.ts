const SEED = 0x7a3c9e15;

function nextMask(state: number): number {
  let x = state | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}

function xorBytes(input: Uint8Array, salt: Uint8Array): Uint8Array {
  let state =
    (SEED ^
      ((salt[0] << 24) | (salt[1] << 16) | (salt[2] << 8) | salt[3])) >>>
    0;
  if (state === 0) state = SEED;

  const out = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    if ((i & 3) === 0) {
      state = nextMask(state);
    }
    const keyByte = (state >>> ((i & 3) * 8)) & 0xff;
    out[i] = input[i] ^ keyByte;
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function encodeWire(payload: unknown): string {
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  const salt = new Uint8Array(4);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(salt);
  } else {
    for (let i = 0; i < 4; i++) {
      salt[i] = Math.floor(Math.random() * 256);
    }
  }
  const masked = xorBytes(raw, salt);
  const combined = new Uint8Array(4 + masked.length);
  combined.set(salt, 0);
  combined.set(masked, 4);
  return bytesToBase64(combined);
}

export function decodeWire<T>(encoded: string): T | null {
  try {
    const trimmed = encoded.trim();
    if (!trimmed) return null;
    const combined = base64ToBytes(trimmed);
    if (combined.length < 5) return null;
    const salt = combined.subarray(0, 4);
    const masked = combined.subarray(4);
    const plain = xorBytes(masked, salt);
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    return null;
  }
}

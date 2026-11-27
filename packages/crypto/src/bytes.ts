// Small byte helpers: strict base64url, AES-256-GCM on raw bytes, and zeroing.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { CryptoError } from "./errors";

export const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function zero(b: Uint8Array | undefined): void {
  b?.fill(0);
}

export function assertKey(key: Uint8Array): void {
  if (!(key instanceof Uint8Array) || key.length !== KEY_BYTES)
    throw new CryptoError("invalid_key");
}

export const b64u = (b: Uint8Array): string => Buffer.from(b).toString("base64url");

export function fromB64u(s: string | undefined): Buffer {
  if (s === undefined || !/^[A-Za-z0-9_-]*$/.test(s)) throw new CryptoError("decrypt_failed");
  const b = Buffer.from(s, "base64url");
  if (b.toString("base64url") !== s) throw new CryptoError("decrypt_failed"); // canonical only
  return b;
}

export function seal(key: Uint8Array, plaintext: Uint8Array, aad: Uint8Array) {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { iv, ct, tag: cipher.getAuthTag() };
}

export function open(
  key: Uint8Array,
  parts: { iv: Uint8Array; ct: Uint8Array; tag: Uint8Array },
  aad: Uint8Array,
): Buffer {
  assertKey(key);
  if (parts.iv.length !== IV_BYTES || parts.tag.length !== TAG_BYTES) {
    throw new CryptoError("decrypt_failed");
  }
  try {
    const d = createDecipheriv("aes-256-gcm", key, parts.iv, { authTagLength: TAG_BYTES });
    d.setAAD(aad);
    d.setAuthTag(parts.tag);
    return Buffer.concat([d.update(parts.ct), d.final()]);
  } catch {
    throw new CryptoError("decrypt_failed"); // never expose the underlying reason
  }
}

/** Packs iv|tag|ct into one blob (for wrapped keys). */
export function sealBlob(key: Uint8Array, data: Uint8Array, aad: Uint8Array): Uint8Array {
  const { iv, ct, tag } = seal(key, data, aad);
  return new Uint8Array(Buffer.concat([Buffer.from([1]), iv, tag, ct]));
}

export function openBlob(key: Uint8Array, blob: Uint8Array, aad: Uint8Array): Uint8Array {
  if (blob.length < 1 + IV_BYTES + TAG_BYTES || blob[0] !== 1)
    throw new CryptoError("decrypt_failed");
  const b = Buffer.from(blob);
  const iv = b.subarray(1, 1 + IV_BYTES);
  const tag = b.subarray(1 + IV_BYTES, 1 + IV_BYTES + TAG_BYTES);
  const ct = b.subarray(1 + IV_BYTES + TAG_BYTES);
  const pt = open(key, { iv, ct, tag }, aad);
  try {
    return new Uint8Array(pt); // a copy the caller owns (and zeroes)
  } finally {
    pt.fill(0); // Buffer.concat may use the shared pool: wipe it
  }
}

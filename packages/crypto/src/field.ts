// Field encryption: AES-256-GCM with a random 12-byte IV and mandatory AAD
// `dealerId|table|column|rowId`, so ciphertext copied to another row, column or dealer fails.
// Format: v1.<iv>.<ct>.<tag> (base64url). Never change v1 in place; add v2.
import { b64u, fromB64u, open, seal } from "./bytes";
import { CryptoError } from "./errors";

export type FieldAad = { dealerId: string; table: string; column: string; rowId: string };

export function aadBytes(aad: FieldAad): Buffer {
  const parts = [aad.dealerId, aad.table, aad.column, aad.rowId];
  if (parts.some((p) => typeof p !== "string" || p.length === 0 || p.includes("|"))) {
    throw new CryptoError("invalid_aad");
  }
  return Buffer.from(parts.join("|"), "utf8");
}

export function encryptField(key: Uint8Array, plaintext: string, aad: FieldAad): string {
  const { iv, ct, tag } = seal(key, Buffer.from(plaintext, "utf8"), aadBytes(aad));
  return `v1.${b64u(iv)}.${b64u(ct)}.${b64u(tag)}`;
}

export function decryptField(key: Uint8Array, ciphertext: string, aad: FieldAad): string {
  const parts = typeof ciphertext === "string" ? ciphertext.split(".") : [];
  if (parts.length !== 4 || parts[0] !== "v1") throw new CryptoError("decrypt_failed");
  const [, iv, ct, tag] = parts;
  const pt = open(key, { iv: fromB64u(iv), ct: fromB64u(ct), tag: fromB64u(tag) }, aadBytes(aad));
  try {
    return pt.toString("utf8");
  } finally {
    pt.fill(0);
  }
}

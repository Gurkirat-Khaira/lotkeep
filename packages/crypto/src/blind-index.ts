// Blind index: HMAC-SHA256 with the dealer's blind-index key over normalized input, for exact-match
// lookup (e.g. SSN) without storing or comparing plaintext. Never a plain hash.
import { createHmac } from "node:crypto";
import { assertKey } from "./bytes";
import { CryptoError } from "./errors";

/** Strips spaces and dashes and uppercases, so "123-45-6789" == "123 45 6789". */
export const normalizeForIndex = (value: string): string =>
  value
    .normalize("NFKC")
    .replace(/[\s\p{Pd}−]+/gu, "") // whitespace and every Unicode dash (incl. minus sign)
    .toUpperCase();

/**
 * A separate key per column (HMAC of the dealer's blind-index key), so equal values in different
 * columns (an SSN and a license number) never produce the same index.
 */
export function columnIndexKey(dealerIndexKey: Uint8Array, column: string): Uint8Array {
  assertKey(dealerIndexKey);
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(column)) throw new CryptoError("invalid_aad");
  return new Uint8Array(createHmac("sha256", dealerIndexKey).update(`bidx:v1|${column}`).digest());
}

export function blindIndex(key: Uint8Array, value: string): string {
  assertKey(key);
  return createHmac("sha256", key).update(normalizeForIndex(value), "utf8").digest("hex");
}

// One generic error type. Messages never contain keys, plaintext or ciphertext.
export type CryptoErrorCode =
  | "decrypt_failed"
  | "invalid_key"
  | "invalid_aad"
  | "key_destroyed"
  | "key_unavailable";

export class CryptoError extends Error {
  override readonly name = "CryptoError";
  readonly code: CryptoErrorCode;

  constructor(code: CryptoErrorCode) {
    super(code);
    this.code = code;
  }
}

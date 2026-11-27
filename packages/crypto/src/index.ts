// @dms/crypto: envelope field encryption, per-customer keys (crypto-shredding), blind index.
export { blindIndex, columnIndexKey, normalizeForIndex } from "./blind-index";
export { CryptoError, type CryptoErrorCode } from "./errors";
export { decryptField, encryptField, type FieldAad } from "./field";
export {
  Destroyed,
  destroyCustomerKey,
  EnvKeyProvider,
  getBlindIndexKey,
  getOrCreateCustomerKey,
  type KeyProvider,
  readField,
  rotateMasterKey,
  setKeyProvider,
  withCustomerKey,
} from "./keys";

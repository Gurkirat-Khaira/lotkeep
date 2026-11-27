# packages/crypto: field encryption

- AES-256-GCM, random 12-byte IV per encryption. Ciphertext format `v1.<iv>.<ct>.<tag>` (base64url). Bump the version prefix for any format change; never change `v1` in place.
- **AAD is mandatory:** `dealerId|table|column|rowId`. Decrypting with a different AAD must throw; that is what stops copied ciphertext.
- Key hierarchy: master (`KeyProvider`, env in dev) → dealer key → per-customer key and per-dealer blind-index key. Only wrapped keys are stored (`data_keys`).
- Crypto-shredding = `destroyCustomerKey`; reads then return `Destroyed`. Only the retention job calls it, after every retention clock has expired.
- Blind index: HMAC-SHA256 with the dealer's blind-index key over normalized input (strip spaces and dashes, uppercase). Never a plain hash.
- Never log, stringify or put in an error message any key, plaintext or ciphertext. Errors are generic (`decrypt_failed`).
- Use Node `crypto` only. Don't add crypto libraries. Coverage for this package stays ≥ 95%.

# 0006: Field encryption keys, shredding and master-key rotation

- **Status:** accepted
- **Date:** 2026-11-27
- **Deciders:** builder (owner to review)
- **Plan task:** Plan 1, Task 6

## Context
Spec §5.4 requires AES-256-GCM field encryption with a master → dealer → per-customer key
hierarchy, HMAC blind indexes, and crypto-shredding per customer. Every table is under forced RLS,
and that includes the owner role.

## Decision
- **Formats**
  - Fields use `v1.<iv>.<ct>.<tag>` (base64url), with AAD `dealerId|table|column|rowId`. AAD parts
    can't be empty or contain `|`.
  - Wrapped keys are the blob `0x01 | iv | tag | ct`. The master wrap uses AAD
    `dms:master-wrap:v1`. Child keys are wrapped by the dealer key with AAD
    `dms:key:v1|dealerId|scope|subjectId|version`, so a wrapped key copied to another
    dealer, scope or customer can't be opened.
- **Storage:** `app.data_keys`, one row per (dealer, scope, subject, version). It holds only
  wrapped keys, is under forced RLS, and is registered in the leak suite. Concurrent first use is
  safe: `ON CONFLICT DO NOTHING`, then the row is re-read.
- **Scoping:** every key function checks that the transaction's `app.dealer_id` equals the dealer
  it was given (`key_unavailable` otherwise). RLS is still the real boundary.
- **Shredding:** `destroyCustomerKey` empties `wrapped_key` and sets `destroyed_at`. A check
  constraint makes sure a destroyed row holds no key material. If the customer never had a key, it
  leaves a tombstone, so no key can be created for them later. Reads return `Destroyed`.
- **Errors:** a single `CryptoError` with a code (`decrypt_failed`, `invalid_key`, `invalid_aad`,
  `key_destroyed`, `key_unavailable`). It never carries a key, plaintext or ciphertext.
- **Zeroing:** the library zeroes the key buffers it creates and decrypted plaintext buffers.
  `withCustomerKey` zeroes the key after its callback. Node's internal KeyObject copies can't be
  zeroed.
- **Master-key rotation** takes the dealer ids from the operator:
  `rotateMasterKey(old, new, dealerIds)`. With forced RLS, no role (not even `dms_owner`) can list
  every dealer, so this is a third argument beyond the plan's signature. Rotation re-wraps dealer
  keys only. Run it with the app stopped, then deploy the new `MASTER_KEY`. There is no dual-key
  provider yet.
- **Plan numbering:** the plan names this migration `0002_keys.sql`, but `0002` was already taken
  by the Task 4 hardening migration, so this is `0003_keys.sql`. `0004_data_keys_guard.sql` and
  `0005_data_keys_guard_v2.sql` followed, so Task 7's audit migration becomes `0006`.

**Security review follow-ups**
- **Shred/first-use race:** create and destroy take
  `pg_advisory_xact_lock(hashtextextended('dms:key|dealer|scope|subject', 0))` and re-read the
  key under the lock. The tombstone insert is an upsert. Two concurrent tests cover both orders.
- **`data_keys` guard (migration `0004`):**
  - DELETE and TRUNCATE are revoked from `dms_app`, because losing a dealer key loses all of that
    dealer's PII.
  - A `BEFORE UPDATE` trigger keeps id, scope, subject, version and `created_at` immutable, and
    stops a destroyed key from being revived.
  - Moving a key to another dealer is still blocked by RLS WITH CHECK.
- **Blind indexes:**
  - Each column gets its own key, `HMAC(dealer blind-index key, "bidx:v1|<column>")`, so an SSN
    and a license number with equal digits can't be linked.
  - Input is NFKC-normalized before stripping spaces and dashes and uppercasing.
  - **Shredding doesn't remove `*_bidx` values. The retention job must null the customer's
    `*_bidx` columns in the same transaction as `destroyCustomerKey`** (Plan 7).
- **Rotation is idempotent:**
  - dealers already on the new key are skipped;
  - each new wrap is unwrapped and compared before it's written;
  - dealers whose key opens with neither master key are returned in `failed`.
- **Hygiene:** decrypted key buffers are zeroed after copying (`Buffer.concat` can use the shared
  pool). Base64url must be canonical. `@dms/db/testing` throws outside Vitest, and a repo-hygiene
  test forbids importing it outside `test/` and `vitest.config.ts`.
- **Owner code review (guard v2, migration `0005`):**
  - A live key must have key material (CHECK), and only `customer` keys can be destroyed. Before
    this, an UPDATE could empty or destroy a dealer key.
  - Destroyed rows can't change at all. A tombstone for any version blocks inserting a new key
    for that subject, so a shredded customer can't be revived as v2.
  - The guard raises its own SQLSTATE, `DMS01`.
  - Key reads take `FOR SHARE` (tombstones first), so a shred waits for in-flight users of the key.
  - `destroyCustomerKey` takes the injected `Clock`. A re-run keeps the original `destroyed_at`.
  - Rotation reports `missing` (no dealer key) and records per-dealer errors in `failed` instead of
    aborting.
  - Blind indexes strip every Unicode dash (`\p{Pd}`, U+2212).
  - Legacy `dms_test_template` / `dms_test_<n>` test databases are cleaned up automatically.
- **Known limitation:** the master wrap's AAD doesn't name the dealer, so a dealer-key blob swapped
  between two dealers' rows would unwrap. Child-key AADs do bind the dealer, so this doesn't open
  another dealer's customer keys. Add `wrap(k, context)` together with KMS before production.
- **Test databases:** each package now uses its own prefix, through
  `dbTestConfig("<prefix>")` from `@dms/db/testing/vitest`: `dms_test_db_*`, `dms_test_crypto_*`.
  This resolves the collision noted in ADR 0005.

## Consequences
- An operator tool that lists dealers (a BYPASSRLS ops role, or a registry outside RLS) is needed
  before production. Track it at the production-readiness gate, together with KMS (hosted) and
  dual-key rotation.
- `packages/crypto` coverage is enforced at ≥ 95% in its test script.

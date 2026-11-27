# packages/entitlements: plans and signed license keys

- **Tokens:** `base64url(JSON payload).base64url(Ed25519 signature)`, verified with the **public** key in `keys/public.pem` (`crypto.verify(null, …)`).
- **Fail closed to Community:** bad signature, malformed, expired or wrong subject → Community. Never throw a 500 because of a bad key.
- `core.*` features are always on, and `loadPlans()` rejects any plan without them. Community `maxLocations` is 1.
- `plans.yaml` holds the draft prices (cents) and the feature map. The owner may change prices; code must never hard-code them.
- **Forbidden:**
  - signing code outside `test/helpers/keys.ts`;
  - private keys anywhere in the repo;
  - env vars or flags that unlock `ee.*`;
  - client-side entitlement decisions (the web only _displays_ `/entitlements`).
- The promotion is just a signed key with `plan: "promotion"`, all `ee.*` features and an `expiresAt`. Reminders run at 90/30/7 days (worker job `entitlement.expiry`).

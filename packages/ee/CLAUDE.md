# packages/ee: commercial (paid) features

- **License:** this folder is under `packages/ee/LICENSE` (commercial, DRAFT), not AGPL. Every source file starts with:
  `// SPDX-License-Identifier: LicenseRef-DMS-Commercial`
  The repo-hygiene test fails without it.
- Every entry point checks its feature with `requireFeature("ee.…")` on the API side. The check lives in `packages/entitlements`; don't re-implement it here.
- **Core never imports from `ee` directly.** Core calls `ee` through a small registry or interface, so a Community build works without `ee` features enabled.
- Data created by paid features must stay **readable and exportable** after a license or promotion expires. Only creating or changing new paid data is blocked.
- Current capability: `locations.ts` → `createAdditionalLocation()` (requires `ee.additional_locations` and `count < maxLocations`).
- Never move compliance, security, the first location or data export into `ee`; they are core forever.

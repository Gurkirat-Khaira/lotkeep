# 0002: Locations inside a dealer, and signed-key entitlements

- **Status:** accepted
- **Date:** 2026-11-27
- **Deciders:** owner (open core, pricing draft, promotion), builder (mechanism)
- **Plan task:** Plan 1, Task 1 (implemented in Tasks 4, 9 and 11)

## Context
A dealer is one legal entity that may run several licensed locations (spec §5.3 rule 7). The
business model is AGPL core + a commercial `packages/ee` (spec §4a), with a free launch promotion
of about 6 months (spec §5.8). The FTC Safeguards Rule makes security features mandatory for
every dealer, so they can never be paid.

## Decision
**Locations**
- The dealer is the RLS tenant. Locations live inside it, and location-scoped tables carry
  `location_id` with a composite FK `(dealer_id, location_id)`.
- Location access is enforced in the API (`requireLocation()`, `scopeToLocations()`) and covered
  by its own leak suite. `owner`/`auditor` are dealer-wide; `fi`/`sales` see only their assigned
  locations; `auditor` is read-only.

**Entitlements**
- Features are `core.*` (never gated: compliance, security, the first location, export) or `ee.*`.
- `ee.*` is unlocked only by an **Ed25519-signed license key**, verified **server-side** with an
  embedded public key. No key, or an invalid one, means Community. There is **no env var or flag**
  that unlocks `ee.*`.
- The launch promotion is itself a signed key (`plan: "promotion"`, all `ee.*`, `expiresAt`), so
  ending it needs no code change. Reminders go out at 90/30/7 days; the end is announced ≥ 90 days
  ahead.
- The capability to create a **second and later location lives in `packages/ee`**, under the
  commercial license. A limit written only in AGPL code could legally be deleted.
- Draft prices live only in `packages/entitlements/plans.yaml`.
- The `packages/ee/LICENSE` (DRAFT) has applied from the first commit. It grants free use under the
  promotion key and keeps data readable and exportable after a key ends.
- A CLA (CLA Assistant Lite, `cla-signatures` branch) is required for every outside contribution,
  so contributions can also ship in `ee/`.

## Consequences
- Core never imports `ee` directly; it calls through a small registry, so a Community build works.
- Signing code exists only in test helpers. The private production key is never in the repo.
- The license and CLA texts need attorney review before public launch (spec §8).

## Alternatives considered
- An `isPromotion` switch or env var: rejected, because anyone self-hosting could flip it, and
  ending the promotion would need a release.
- Paid code in a private repo: rejected by the owner; public `ee/` under a commercial license.

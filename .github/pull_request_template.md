## What and why
<!-- One or two sentences. Link the plan task or issue. -->

## Definition of Done
- [ ] The tests named in the task exist, failed before the change, and pass now
- [ ] `pnpm verify` is green (plus `pnpm test:e2e` if `apps/web` changed)
- [ ] New tenant tables are registered in the leak suite; new routes have Zod input, `requireMfa`, a role guard, location scoping where needed, and an audit event for writes
- [ ] Security review done if this touches tenancy, auth, crypto, licensing or PII (findings fixed or recorded in an ADR)
- [ ] Rule values cite a dated source in `docs/research/` (compliance review if rules changed)
- [ ] Plan checkbox ticked; any open decision has an ADR in `docs/adr/`

## Safety
- [ ] Synthetic data only: no real names, SSNs, DLs, addresses, phones or VINs
- [ ] No secrets, keys or `.env` files
- [ ] I have signed the [CLA](../CLA.md) (the bot will ask)

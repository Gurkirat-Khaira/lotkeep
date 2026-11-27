# packages/db: schema, migrations, tenancy

- **Two pools.** `ownerDb` (role `dms_owner`) is only for migrations, seeds and tests that set up data. `appDb` (role `dms_app`, NOBYPASSRLS) is for everything at runtime. Request handlers and jobs never import the owner pool.
- **Every dealer query** goes through `withDealer(dealerId, tx => …)`. It sets `app.dealer_id` with `set_config(…, true)`, which is transaction-local, so pooled connections can't leak.
- **New tables:** use `/new-tenant-table`.
  - PK `(dealer_id, id)`; composite FKs; UUIDv7 via `newId()`.
  - Money is `bigint` cents; time is `timestamptz`; PII is only `*_ct` (+ `*_bidx`).
- **Migrations:** edit the schema → `pnpm db:generate` → append `tenantRlsSql()` output → `pnpm db:migrate`.
  - Never edit an applied migration; add a new one.
  - Number files in sequence (`0007_…`), never reorder.
  - Keep `drizzle-kit check` clean.
- **Leak suite:** every table with `dealer_id` must be registered (`registerTenantTable` / `registerLocationTable`), otherwise the catalog test fails. Global tables go in `GLOBAL_TABLES` with a comment explaining why.
- **Audit log:** append only through `appendAudit`. Never UPDATE or DELETE `audit_events` (the role and trigger forbid it). `meta` must not contain PII keys.
- **Tests:** per-worker databases cloned from `dms_test_template`. Seed with `test/helpers/seed.ts`; each test seeds its own dealers.

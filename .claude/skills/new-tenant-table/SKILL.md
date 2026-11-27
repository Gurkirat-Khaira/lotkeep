---
name: new-tenant-table
description: "Use whenever adding a database table that stores dealer data: dealer_id, forced RLS, migration, location scoping and leak-suite registration."
argument-hint: "<table_name> [location]"
---
Create table `$ARGUMENTS` following this checklist. Don't skip steps.

1. Drizzle schema in `packages/db/src/schema/<file>.ts`:
   - `dealer_id uuid not null`; `id` UUIDv7; PK `(dealer_id, id)`;
   - if "location" is in the arguments: `location_id uuid` with FK `(dealer_id, location_id)` → `locations`;
   - FKs to other tenant tables are composite `(dealer_id, x_id)`; `created_at timestamptz default now()`;
   - money columns are `bigint` cents; PII columns are `*_ct text` (+ `*_bidx` when searchable). Never store plaintext PII.
2. `pnpm db:generate`, then append `tenantRlsSql('<table>')` to the new migration. Check that ENABLE + FORCE + policy (USING + WITH CHECK) are present.
3. Register it: `registerTenantTable(table, sample)` or `registerLocationTable(table, sample)`, with a synthetic `sample`.
4. `pnpm db:migrate && pnpm --filter @dms/db test leak-suite`. The new table must appear in the suite and pass.
5. If the table gets API routes, use `/new-api-route`.
6. Run the `security-reviewer` agent on the diff.

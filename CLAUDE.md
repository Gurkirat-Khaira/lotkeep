# CLAUDE.md

Open-source **Dealer Management System (DMS)** for small independent used car dealers, California first. The product name is a placeholder kept only in `brand/brand.json`. Owner and security lead: Gurkirat (Kirat) Singh Khaira (`Gurkirat-Khaira`). It is **not used for real deals yet**: Phase 1 is a web app, run locally with synthetic data.

## Where things are
- Design (source of truth): `docs/superpowers/specs/2026-11-25-open-source-dms-design.md`
- Active plan: the newest file in `docs/superpowers/plans/` with unchecked `- [ ]` boxes. Use `/plan-next`.
- Research and legal citations: `docs/research/` (CARS Act: `California CARS Act SB 766.md`)
- Decisions: `docs/adr/` · Session notes: `docs/progress/` (write one with `/handoff`)
- Package rules: the `CLAUDE.md` inside each `apps/*` and `packages/*` folder. Read it before editing that package.

## Workflow
1. Run `/plan-next`: read the next unchecked task and its files and interfaces.
2. TDD (superpowers:test-driven-development): write the named failing tests → run them and watch them fail → write minimal code → watch them pass.
3. `pnpm verify` must be green. Run the `security-reviewer` subagent for tenancy, auth, crypto, licensing or PII changes, and `compliance-reviewer` for rule values.
4. Make one commit per task with the plan's message, tick the box, and add an ADR for any open decision.
5. Before the session ends, run `/handoff`.

Use the exact file paths, exported names and test names from the plan; later plans depend on them. Keep files small and single-purpose.

## Commands (each exists from the Plan 1 task shown)
| Command | What | From |
|---|---|---|
| `scripts/setup.sh` | first-time setup: checks tools (incl. gitleaks ≥ 8.19) and installs git hooks; from Task 2 also creates `.env` with random secrets | 1 (+2) |
| `pnpm verify` | lint + typecheck + test (the bar for every commit) | 1 |
| `pnpm test` / `pnpm --filter <pkg> test <name>` / `pnpm test:slow` | unit tests: all, focused, or slow | 1 |
| `pnpm brand:sync` | regenerate favicon, manifest and CSS tokens from `brand/` (PNG icons from Task 13) | 1 |
| `pnpm dev:up` / `dev:down` / `dev:reset` | Postgres + MinIO up / down / wipe | 2 |
| `pnpm db:generate` → `pnpm db:migrate` | migration from the Drizzle schema (append `tenantRlsSql` output) | 2 / 4 |
| `pnpm test:e2e` | Playwright + axe | 13 |
| `pnpm size` | bundle budget | 13 |
| `pnpm dev:up --full` | + api, web, worker containers | 14 |
| `pnpm db:seed` / `pnpm perf:api` | synthetic demo dealer / API latency budget | 15 |

## Non-negotiable rules
**Tenancy**
- The dealer is the tenant. Every tenant table has `dealer_id`, and RLS is **enabled and forced** with exactly `dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid`.
- The app connects as `dms_app` (NOBYPASSRLS). Every dealer query runs inside `withDealer()`.
- Register every new table with `registerTenantTable` / `registerLocationTable`. Use `/new-tenant-table`.

**Locations**
- Location-scoped tables have `location_id`. Routes use `requireLocation()` and `scopeToLocations()`.
- `owner`/`auditor` see all locations; `fi`/`sales` see only their assigned ones; `auditor` is read-only.

**Security** (free core, never optional)
- MFA is mandatory for everyone. PII reveal, export and license install need step-up MFA (≤ 10 min).
- AES-256-GCM field encryption with per-customer keys; HMAC blind indexes; append-only hash-chained audit log.

**PII**
- Never log, return or commit decrypted PII or `*_ct` columns. The logger redacts them; don't work around that.

**Synthetic data only**
- No real people, SSNs, DLs, addresses, phones or VINs.
- Test SSNs start with `000-` or `9`, or are exactly `123-45-6789`. VINs come from `fakeVin()`. A hook blocks the rest, in file edits and Bash commands alike.

**Secrets**
- `.env*` files are unreadable to file tools. That includes `.env.example`, because a deny rule can't make exceptions.
- To add a key to `.env.example`, append it with Bash (`printf 'NEW_KEY=\n' >> .env.example`), or ask the owner.
- Never write code or scripts that read `.env` indirectly to show its values.

**Entitlements**
- `core.*` (compliance, security, one location, export) is never gated. `ee.*` goes through `requireFeature()`, resolved from an Ed25519-signed license key.
- Never add a bypass flag or env var. Never write signing code outside test helpers. Never commit a private key.

**Licensing**
- The root is AGPL-3.0. `packages/ee/**` is commercial; every source file there starts with `// SPDX-License-Identifier: LicenseRef-DMS-Commercial`. Outside contributions need the CLA.

**Branding**
- Never type the product name in code. Use `brand` from `@dms/brand`. Package scope is `@dms/*`; env vars are `DMS_*`.

**Wrap-ready web**
- Client-only SPA, no SSR. Device APIs (`navigator`, print, files, camera) only through `packages/platform`.

**Conventions**
- Money is integer cents (`Cents`; percentages in basis points; `percentOfCents` rounds half-up).
- Time is UTC `timestamptz`; business dates are in the location's IANA timezone; always use the injected `Clock`.
- IDs are UUIDv7 (`newId()`). Errors use the `AppError` envelope `{ error, message?, details?, requestId }`.
- User-facing text goes through `t()` from `@dms/i18n` (EN complete, ES falls back).

**Budgets**
- Web initial JS ≤ 250 KB gzip; API list p95 ≤ 150 ms; WCAG 2.1 AA (axe: zero serious or critical).

**Stack is fixed**
- Node 22, TS strict, pnpm + Turborepo, Biome, Vitest, Playwright, Postgres 16, MinIO, Drizzle, Hono + Zod, Better Auth, pg-boss, pino, Vite + React 19, TanStack Router + Query, Tailwind v4 + shadcn/ui.
- Dependencies: only those in Plan 1's **Approved dependencies** list. **Ask before adding anything else** (runtime or dev).

## Compliance (not legal advice)
- Rule values come only from cited, dated entries in the rule pack, which trace to `docs/research/`. Never invent or "fix" a fee, deadline or legal text.
- The CARS Act rules have IDs CA-CARS-01…18 in the research report; reference the ID in tests and commits.
- If code and research disagree, **stop and ask the owner**.

## Stop and ask the owner when
- a rule value conflicts with the spec or research;
- a new dependency seems needed;
- a test can only pass by weakening a rule above;
- anything needs real accounts, domains, money or signing keys;
- you're about to `git push --force`, delete data volumes or change `.claude/` settings.

## Working with the owner
He is a CS student learning how a real DMS works from a paid system alongside this project. After each task, explain what was built and why in 3–5 plain sentences, then **continue with the next task** unless he has said stop. Always pause for anything on the "Stop and ask" list. Ask one question at a time.

# Plan 1 — Secure Foundation Implementation Plan (v5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use `/plan-next` to pick up the next unchecked task and `/handoff` before ending a session.

**Goal:** Build the foundation every DMS module sits on:
- the monorepo, with Claude Code already configured and branding in one place;
- the local Docker environment;
- a shared kernel (config, clock, money, errors, logging);
- dealer-isolated Postgres with locations;
- field encryption and a tamper-evident audit log;
- signed-license entitlements;
- a hardened API with MFA-enforced login;
- a fast, wrap-ready web shell (EN/ES-ready);
- a worker;
- synthetic seed data and a tested backup/restore.

**Architecture:** pnpm/Turborepo TypeScript monorepo.
- A client-only Vite + React SPA (`apps/web`) talks to a Hono API (`apps/api`). Jobs run in `apps/worker` on pg-boss.
- One Postgres database. The **dealer (legal entity) is the tenant**, isolated by forced row-level security on `dealer_id`.
- Each dealer has one or more **locations**. Location access is enforced in the API layer.
- Sensitive fields are envelope-encrypted (master → dealer → customer keys).
- Device features go through `packages/platform`, so the same SPA can later be wrapped by Tauri for Windows, macOS, Linux and Android.
- Product name, logo and colors live only in `brand/` (the working name **Lotkeep** is a placeholder).

**Tech Stack:** Node 22 LTS, TypeScript (strict), pnpm, Turborepo, Biome, Vitest, Playwright (+ `@axe-core/playwright`), Docker Compose, PostgreSQL 16, MinIO, Drizzle ORM + drizzle-kit, Hono, Zod, Better Auth (twoFactor + passkey), pg-boss, pino, Vite, React 19, TanStack Router + Query, Tailwind CSS v4, shadcn/ui, `uuid` (v7). Built with **Claude Code**.

**Spec:** `docs/superpowers/specs/2026-11-25-open-source-dms-design.md` (v5.2). Read §3, §5.1–§5.4 and §5.7–§5.9 before starting. Background: `docs/research/Open source DMS product outline.md`, `docs/research/California CARS Act SB 766.md`.

**Already in the repo before Task 1** (seeded from the owner's `DMS Software` folder):
- `CLAUDE.md`, `.claude/` (settings, hooks, agents, skills), package-level `CLAUDE.md` files
- `brand/`
- `docs/`

Task 1 **builds around them and must not overwrite them**. Change them only when a task says so.

## Global Constraints

- Node **22 LTS**; TypeScript `"strict": true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`; package manager **pnpm** (via corepack); internal package scope **`@dms/*`**; env vars prefixed `DMS_` where they are app settings.
- PostgreSQL **16+**. Every tenant table has `dealer_id uuid NOT NULL`. RLS is **enabled and forced**, with policy predicate exactly `dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid`.
- App DB role `dms_app` is **NOBYPASSRLS** and owns nothing; migrations run as `dms_owner`. `dms_app` has `statement_timeout = 15s` and `idle_in_transaction_session_timeout = 30s`.
- Primary keys are **UUIDv7**. References inside a dealer use composite FKs on `(dealer_id, id)`. Location-scoped tables carry `location_id` with FK `(dealer_id, location_id)`.
- Location access is checked in the API on **every** location-scoped read and write. Dealer-wide roles are `owner` and `auditor`; `fi` and `sales` see only their assigned locations.
- **Money** is integer **cents** (`Cents` branded type), never floats. Percentages are basis points. Rounding is half-up to the cent, in one function (`percentOfCents`).
- **Time:** store `timestamptz` in UTC. Every dealer and location has an IANA `timezone` (default `America/Los_Angeles`). Business dates are computed in the location's zone. Code reads time only through an injected `Clock`, never `Date.now()` directly in domain code.
- **Errors:** every API error is `{ error: <snake_case code>, message?: string, details?: unknown, requestId: string }`. There are no stack traces in responses.
- **Logging:** pino JSON with a request ID. The redaction list covers `ssn, dl, dob, password, token, authorization, cookie, *_ct, secret`. Never log request bodies on PII routes.
- Field encryption is **AES-256-GCM**; AAD = `dealerId|table|column|rowId`; keys go master → dealer → **per-customer**; lookups use an **HMAC-SHA256 blind index** (per-dealer key), never plain SHA-256.
- **MFA is mandatory for every user, with no opt-out** (TOTP or passkey). **Step-up:** PII reveal, data export and license install require a second factor completed in the last 10 minutes. Roles: `owner`, `fi`, `sales`, `auditor`.
- The audit log is append-only and hash-chained; `dms_app` can never UPDATE or DELETE it.
- Entitlements are checked **server-side** from an **Ed25519-signed license key** (public key embedded; no valid key = Community).
  - `core.*` features (all compliance, security, one location, data export) are never gated.
  - The launch promotion is a signed key that grants every `ee.*` feature until its `expiresAt`.
  - The private signing key is **never** in the repo; tests generate a throwaway key pair.
  - There is no env var or flag that unlocks `ee.*`.
- Anything under `packages/ee/` starts with `// SPDX-License-Identifier: LicenseRef-DMS-Commercial`. The capability to create more than one location lives there.
- **Branding:** the product name, logos and colors appear only in `brand/` (plus `docs/`). Code reads them through `@dms/brand`. A hygiene test enforces this.
- **i18n:** every user-facing string goes through `t()` from `@dms/i18n`. English is complete. The Spanish catalog exists and falls back to English per key.
- Outside `packages/platform`, code must not use `navigator`, `window.print`, file-picker or camera APIs directly. This is enforced by Biome `noRestrictedGlobals`, with a `packages/platform` override. No server-side rendering in `apps/web`.
- **Synthetic data only:**
  - No real names, SSNs, licenses, addresses, phones or VINs tied to people anywhere (code, fixtures, seeds, logs, screenshots, commits).
  - Test SSNs start with `000-` or `9`, or are exactly `123-45-6789`.
  - Test VINs come from `fakeVin()`.
  - Never log decrypted PII.
- Repo root is **AGPL-3.0**. `packages/ee/` is under its own commercial license (free use only under a valid license key, including the promotion key). A **CLA is required** for every outside contribution (CLA Assistant Lite). The license and CLA texts are marked **DRAFT** until attorney review.
- **Performance budgets:**
  - initial web JS ≤ **250 KB gzip**;
  - route chunks ≤ 100 KB gzip;
  - API p95 ≤ **150 ms** for list endpoints on the seed data set (local).
  - CI fails if a budget is exceeded.
- **Accessibility:** WCAG 2.1 AA. Playwright E2E runs axe on every page it visits, with zero serious or critical violations.
- Lint and format with **Biome**; unit tests with **Vitest**; E2E with **Playwright**. Windows host: work inside **WSL2** with Docker Desktop; commands are bash.

## Approved dependencies

Anything not listed here needs the owner's OK first. Record the reason in an ADR.

- **Runtime:**
  - API and data: `hono`, `@hono/node-server`, `zod`, `drizzle-orm`, `pg` (one Postgres driver, shared with pg-boss), `pg-boss`, `better-auth`, `pino`, `uuid`, `yaml`;
  - web: `react`, `react-dom`, `@tanstack/react-router`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`;
  - shadcn/ui's own deps: `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`.
- **Dev:**
  - language and build: `typescript`, `@types/node`, `@types/pg`, `turbo`, `tsx`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `@tanstack/router-plugin`;
  - quality: `@biomejs/biome`, `vitest`, `@vitest/coverage-v8`, `@playwright/test`, `@axe-core/playwright`;
  - database: `drizzle-kit`.
- **Tools outside npm** (installed by the owner, Part A of the starter prompt): Node 22, pnpm via corepack, Docker Desktop, `gh`, and `gitleaks` **≥ 8.19** from the GitHub release binary. Ubuntu's apt package is older and lacks `gitleaks git`.
- **Not allowed:** image libraries (`sharp` etc.), `size-limit`, lodash, moment, any ORM or auth library besides the above. PNG icons are rendered with Playwright (already approved) and bundle size is measured with Node's `zlib`.

## Definition of Done (every task)

1. The tests named in the task exist, failed before the implementation, and pass now.
2. `pnpm verify` is green (`lint && typecheck && test`, plus `test:e2e` when `apps/web` changed).
3. Every new tenant table is registered in the leak suite. Every new route has Zod input, `requireMfa`, a role guard, location scoping where needed, and an audit event for writes.
4. The `security-reviewer` subagent ran on tasks touching tenancy, auth, crypto, licensing or PII, and its findings are fixed or recorded in an ADR.
5. The plan checkbox is ticked and there is one commit with the given message. Any open decision has an ADR in `docs/adr/`.

## Stop and ask the owner when

- a rule value (fee, deadline, legal text) conflicts with the spec or research;
- a dependency outside the Approved dependencies list seems necessary;
- a test can only pass by weakening a Global Constraint;
- something needs real-world data, accounts or money (domains, GitHub org, signing keys).

## Testing setup (applies to all DB tests)

- Vitest `globalSetup` runs migrations once into a template database `dms_test_template`. Each Vitest worker clones it to `dms_test_<workerId>` (`CREATE DATABASE … TEMPLATE …`), so tests run in parallel without sharing rows.
- Helpers in `packages/db/test/helpers/`: `seedDealer()`, `seedLocation()`, `seedUser(role, locations)`, `asApp()`, `asOwner()`. Every test seeds what it needs; there are no shared fixtures across files.
- Tests use `FixedClock` from `@dms/core`.

## Review Focus

1. **Pooled connection reused after a transaction:** `app.dealer_id` reads back as `''`. Queries must return zero rows, never all rows. Pinned in Task 4 (`empty dealer setting returns no rows`).
2. **Staff assigned to location A request a location-B record by ID** (or send `X-Location-Id: B`): they must get 404/403, never the record. Pinned in Task 9 (`sales at A cannot read B by id`).
3. **A user in two dealers switches dealer between requests:** the second request must not see the first dealer's data. Pinned in Task 8 (`dealer switch does not leak`).
4. **Calling the API directly without completing MFA:** every non-auth route returns 403 `mfa_required`. Pinned in Task 10 (`api rejects non-MFA session`).
5. **Ciphertext copied between rows or customers:** decrypt must fail and never return another person's data. Pinned in Task 6 (`AAD mismatch throws`).
6. **Forged or edited license key:** it must resolve to Community, never Pro. Pinned in Task 11 (`tampered payload fails`).
7. **PII in logs:** a request carrying an SSN must not write it to any log line. Pinned in Task 3 (`logger redacts pii keys`) and Task 12 (`create customer logs no ssn`).

`scripts/test/review-focus.test.ts` (Task 15) checks that every pinned test name above exists in the test suite.

## Task order and dependencies

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15. Tasks 5–7 depend only on 4; Task 13 needs 10–12.

---

### Task 1: Monorepo scaffold, licensing, CI, brand package and Claude Code wiring

**Files:**
- Verify (already present, do not overwrite): `CLAUDE.md`, `.claude/**`, `apps/*/CLAUDE.md`, `packages/*/CLAUDE.md`, `brand/**`, `docs/**`
- Create root config: `package.json` (scripts below), `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `biome.json`, `.gitignore` (adds `.env`, `.env.*` except `.env.example`, `backups/`, `CLAUDE.local.md`, `.claude/settings.local.json`), `.nvmrc` (`22`), `.editorconfig`, `.gitattributes` (`* text=auto eol=lf`)
- Create legal and community files: `LICENSE` (AGPL-3.0), `packages/ee/LICENSE` (DRAFT commercial: production use requires a valid license key; the free launch-promotion key is a valid key until its published expiry; the end is announced ≥ 90 days ahead), `CLA.md` (DRAFT individual + entity CLA granting the maintainer the right to relicense contributions), `README.md` (header rendered from `brand/`), `SECURITY.md` (private vulnerability reporting via GitHub Security Advisories), `CONTRIBUTING.md` (CLA, synthetic-data rule, conventional commits), `CODE_OF_CONDUCT.md`, `NOTICE-NOT-LEGAL-ADVICE.md`, `TRADEMARKS.md` (placeholder: the name is not final)
- Create CI and GitHub files: `.github/workflows/ci.yml` (install with frozen lockfile → lint → typecheck → test → build; the size budget step is added in Task 13; CodeQL; gitleaks run from a pinned release binary (≥ 8.19; pin the same version the owner installed and record it in ADR 0001), `gitleaks git --redact`; `pnpm audit --prod --audit-level high`), `.github/workflows/cla.yml` (CLA Assistant Lite; signatures in the `cla-signatures` branch), `.github/dependabot.yml`, `.github/pull_request_template.md` (checklist = Definition of Done), `.github/ISSUE_TEMPLATE/{bug,feature}.yml`
- Create `.gitleaks.toml` (default rules + allowlist for `brand/assets/*.svg` and `**/test/fixtures/**`)
- Create `scripts/git-hooks/pre-commit` (biome on staged files + `gitleaks git --staged --redact`; if gitleaks is missing it stops with an install hint, never silently skips)
- Create `scripts/setup.sh` (checks node 22, pnpm, docker, gh, and gitleaks ≥ 8.19 with an install hint if it's older; runs `git config core.hooksPath scripts/git-hooks`). `.env` generation is added in Task 2, when `.env.example` exists.
- Create `packages/brand/`:
  - `src/index.ts` exports a typed `brand` from `brand/brand.json`, validated by Zod;
  - `scripts/sync.ts` (run with `tsx`) generates `apps/web/public/{favicon.svg,manifest.webmanifest}` (manifest icons point to the SVG, `sizes: "any"`) and `packages/ui/src/brand.css` with CSS variables `--brand-primary`, …;
  - PNG icons are added in Task 13;
  - `packages/brand/test/brand.test.ts`.
- Create `packages/core/src/index.ts`, `packages/core/test/smoke.test.ts`, `scripts/test/repo-hygiene.test.ts`
- Create `docs/adr/0000-template.md`, `0001-stack-and-tenancy.md`, `0002-locations-and-entitlements.md`, `0003-branding-placeholder.md`

**Interfaces:**
- Produces root scripts used by every later task: `pnpm build | test | test:slow | test:e2e | lint | typecheck | verify | brand:sync`.
  - `test` runs `*.test.ts` but excludes `*.slow.test.ts`; `test:slow` runs only `*.slow.test.ts`; `test:e2e` is a no-op until Task 13.
  - `pnpm size` is added in Task 13 and `pnpm perf:api` in Task 15.
- Produces `import { brand } from "@dms/brand"` → `{ name, shortName, slug, tagline, colors, logo, github }`.

- [x] **Step 1: Write failing tests**
```ts
// packages/core/test/smoke.test.ts
it("exports product id", () => { expect(PRODUCT.id).toBe("dms"); });
// packages/brand/test/brand.test.ts
it("brand.json validates", () => { expect(() => loadBrand()).not.toThrow(); });
it("rejects a bad color", () => { expect(() => parseBrand({ ...raw, colors: { ...raw.colors, primary: "teal" } })).toThrow(); });
// scripts/test/repo-hygiene.test.ts
it("CLAUDE.md exists and is under 200 lines", () => { expect(lines("CLAUDE.md")).toBeLessThanOrEqual(200); });
it("claude settings deny reading .env files", () => { expect(settings().permissions.deny).toContain("Read(./.env*)"); });
it("CLA workflow and CLA.md exist", () => { expect(exists("CLA.md") && exists(".github/workflows/cla.yml")).toBe(true); });
it("every file under packages/ee/src has the commercial license header", () => { for (const f of eeSources()) expect(read(f).startsWith("// SPDX-License-Identifier: LicenseRef-DMS-Commercial")).toBe(true); });
it("brand name appears only in brand/ and docs/", () => { expect(filesContaining(brandName(), { caseSensitive: true, exclude: ["brand/**", "docs/**", "README.md", "TRADEMARKS.md", "**/*.svg", "apps/web/public/**" /* generated by brand:sync */] })).toEqual([]); });
// The check matches brand.name exactly and case-sensitively. The lowercase slug may appear in repo URLs, but prefer relative links (e.g. SECURITY.md → ../../security/advisories/new) and `${{ github.repository }}` in workflows so a rename needs no edits there.
it("every project skill exists with matching name", () => { for (const c of ["new-tenant-table","new-api-route","new-rule","plan-next","handoff","verify"]) { expect(exists(`.claude/skills/${c}/SKILL.md`)).toBe(true); expect(frontmatter(`.claude/skills/${c}/SKILL.md`).name).toBe(c); } });
it("no legacy .claude/commands folder", () => { expect(exists(".claude/commands")).toBe(false); });
it("no .env file is tracked", () => { expect(gitTracked(".env*").filter((f) => f !== ".env.example")).toEqual([]); });
it("brand SVGs carry no embedded metadata", () => { for (const f of glob("brand/assets/*.svg")) { expect(read(f)).not.toMatch(/<metadata|c2pa/i); } expect(size("brand/assets/logo-mark.svg")).toBeLessThan(2048); });
```
- [x] **Step 2: Run** `pnpm test`. Expected: FAIL.
- [x] **Step 3: Implement** the files above. Make sure the Claude Code hooks in `.claude/hooks/` (already present) work once `package.json` exists. Run `pnpm brand:sync` once and commit the generated files.
- [x] **Step 4: Run** `pnpm verify`. Expected: PASS **locally**.
  - **Do not create the GitHub repo or push yet.** Ask the owner (starter prompt, "GitHub").
  - After he approves: `gh repo create … --public --source . --push`, then confirm CI (lint, typecheck, test, CodeQL, gitleaks) is green.
  - Until then, CI is verified by running the same commands locally.
- [x] **Step 5: Commit** `git commit -m "chore: monorepo, licenses, CI, brand package and Claude Code wiring"`

### Task 2: Local Docker environment and database roles

**Files:**
- Create: `docker/compose.dev.yml`, `docker/postgres/init/01-roles.sql`, `docker/minio/init.sh` (bucket `dms-records` with object lock, versioning on), `.env.example`
- Create: `packages/db/package.json`, `packages/db/test/roles.test.ts`, `packages/db/test/helpers/sql.ts`. The helper is a tiny tagged-template wrapper over a `pg` Pool: `appSql` / `ownerSql` turn `` sql`… ${v}` `` into `pool.query(text with $1…, values)` and return `rows`. It is used only in tests; app code uses Drizzle.
- Modify: `scripts/setup.sh`: if `.env` is missing, copy `.env.example` → `.env` and fill `MASTER_KEY` and the DB/S3 passwords with fresh random values (`openssl rand -base64 32`). It never overwrites an existing `.env`.
- Notes on `docker/compose.dev.yml`:
  - `postgres:16.6-alpine` and `minio` pinned to a dated release;
  - healthchecks;
  - ports bound to `127.0.0.1` only;
  - named volumes.

**Interfaces:**
- Produces env:
  - `DATABASE_URL_OWNER`, `DATABASE_URL_APP`
  - `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
  - `MASTER_KEY` (base64, 32 bytes)
  - `LICENSE_PUBLIC_KEY_PATH` (default `packages/entitlements/keys/public.pem`)
  - `DMS_WEB_ORIGIN` (default `http://localhost:5173`)
  - `DMS_LOG_LEVEL`
- Produces scripts: `pnpm dev:up`, `pnpm dev:down`, `pnpm dev:reset` (drops volumes after a confirmation prompt), `pnpm db:migrate`, `pnpm db:studio`.

- [ ] **Step 1: Write failing tests**
```ts
it("app role cannot bypass RLS", async () => {
  const r = await appSql`select rolbypassrls, rolsuper from pg_roles where rolname = current_user`;
  expect(r[0]).toEqual({ rolbypassrls: false, rolsuper: false });
});
it("app role has statement timeout", async () => { expect((await appSql`show statement_timeout`)[0].statement_timeout).toBe("15s"); });
it("postgres is not exposed beyond localhost", () => { expect(composePorts("postgres").every((p) => p.startsWith("127.0.0.1:"))).toBe(true); });
```
- [ ] **Step 2: Run** `pnpm --filter @dms/db test`. Expected: FAIL (no database).
- [ ] **Step 3: Implement** the roles:
  - `dms_owner` owns schema `app`;
  - `dms_app NOSUPERUSER NOBYPASSRLS NOCREATEDB`, with default `SELECT, INSERT, UPDATE, DELETE` on future tables and the timeouts above;
  - `REVOKE ALL ON SCHEMA public FROM PUBLIC`.

  `.env.example` holds placeholders only; `scripts/setup.sh` fills real random values into `.env`.
- [ ] **Step 4: Run** `pnpm dev:up && pnpm --filter @dms/db test`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "chore: docker dev env with owner/app db roles"`

### Task 3: Shared kernel: config, clock, money, errors, logging

**Files:**
- Create: `packages/config/src/index.ts` (Zod env schema; `loadConfig()` fails fast with a list of missing or invalid keys, never printing values), `packages/config/test/config.test.ts`
- Create: `packages/core/src/{clock,money,errors,ids,log,index}.ts`, `packages/core/test/{clock,money,errors,log}.test.ts`
- Create: `packages/core/src/fake.ts` (`fakeVin()` with a valid check digit and `"FAKE"` in positions 12–15; `fakePerson()` from a small built-in list of obviously fictional names)

**Interfaces:**
- Produces:
  - `interface Clock { now(): Date }`, `SystemClock`, `FixedClock(at: string)` with `.advance(ms)`.
  - `type Cents = number & { __brand: "Cents" }`; `cents(n: number): Cents` (throws on non-integer); `dollarsToCents("1,234.56")`; `formatUSD(c: Cents, locale: "en" | "es")`; `percentOfCents(c: Cents, basisPoints: number): Cents` (half-up); `clampCents(c, min, max)`.
  - `class AppError extends Error { code: string; status: 400|401|402|403|404|409|413|422|429|500; details?: unknown }`, with helpers `notFound()`, `forbidden(code)`, `conflict(code)`, `invalid(details)`.
  - `isSensitiveKey(key: string): boolean`:
    - splits the key into words (camelCase, `_`, `-`) and lowercases them;
    - true if any word is one of `ssn, dl, dob, password, passwd, token, secret, cookie, authorization`, or the key ends with `_ct`, `Ct` or `_bidx`;
    - so `deadline` and `middleName` are allowed, and `dlNumber`, `ssn_ct` and `accessToken` are blocked.
  - `redactDeep(value, depth = 6)`: copies the object and replaces values under sensitive keys with `"[redacted]"`.
  - `createLogger(config)` → pino logger:
    - pino `redact` covers fixed paths (`req.headers.authorization`, `req.headers.cookie`);
    - `formatters.log` applies `redactDeep`, because pino's `redact` paths can't match key suffixes like `*_ct`.
  - `newId()` (UUIDv7) moves here from `packages/db`.

- [ ] **Step 1: Write failing tests**: `config rejects MASTER_KEY of wrong length`; `config error lists keys without values`; `FixedClock advances`; `percentOfCents rounds half-up (150 bp of 1333333 → 20000)`; `cents rejects 1.5`; `dollarsToCents parses commas`; `formatUSD es uses es-US format`; `logger redacts pii keys` (log `{ ssn: "123-45-6789", nested: { dl_ct: "x" } }` → output contains neither); `isSensitiveKey allows deadline and middleName`; `isSensitiveKey blocks ssn, dlNumber, dob, ssn_ct, accessToken`; `fakeVin passes check digit and contains FAKE`.
- [ ] **Step 2: Run** `pnpm --filter @dms/core --filter @dms/config test`. Expected: FAIL.
- [ ] **Step 3: Implement**. No dependencies besides `zod`, `pino` and `uuid`.
- [ ] **Step 4: Run**. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(core): config, clock, money, errors, logging and fakes"`

### Task 4: Dealers, locations, memberships with forced RLS

**Files:**
- Create: `packages/db/src/schema/tenancy.ts`, `packages/db/src/tenant.ts`, `packages/db/drizzle.config.ts`, `packages/db/migrations/0001_tenancy.sql`, `packages/db/test/rls-leak.test.ts`, `packages/db/test/helpers/{seed,db,global-setup}.ts`

**Interfaces:**
- Produces:
  - `type Role = "owner" | "fi" | "sales" | "auditor"`.
  - `withDealer<T>(dealerId: string, fn: (tx: AppTx) => Promise<T>): Promise<T>`: an app-role transaction with `set_config('app.dealer_id', $1, true)`. It rejects non-UUID input before touching the DB.
  - `tenantRlsSql(table: string, column = "dealer_id"): string`: ENABLE + FORCE RLS and the policy (USING + WITH CHECK).
  - Tables:
    - `dealers(id, legal_name, entity_number, timezone default 'America/Los_Angeles', created_at)` (RLS on `id`);
    - `users(id, email unique citext, created_at)` (global);
    - `locations(dealer_id, id, name, kind enum('main','branch'), address_line1, suite_raw, suite_normalized, city, state char(2), zip, timezone, created_at)` PK `(dealer_id, id)`;
    - `memberships(dealer_id, id, user_id, role, disabled_at null)` PK `(dealer_id, id)`, unique `(dealer_id, user_id)`;
    - `membership_locations(dealer_id, membership_id, location_id)` PK `(dealer_id, membership_id, location_id)`.
  - `normalizeSuite(raw: string): string`: `"OFC 4"`, `"#4"`, `"Ste 4"`, `"Suite 4"`, `"Unit 4"` → `"4"`.
- Migration workflow: edit Drizzle schema → `pnpm db:generate` → append the `tenantRlsSql(...)` output to the generated SQL → `pnpm db:migrate`. CI runs `drizzle-kit check` (no drift).

- [ ] **Step 1: Write failing tests** (seed dealers A and B with one location and one membership each, as owner)
```ts
it("dealer A sees only A locations", async () => {
  const rows = await withDealer(A, (tx) => tx.select().from(locations));
  expect(rows.map((r) => r.dealerId)).toEqual([A]);
});
it("empty dealer setting returns no rows", async () => {
  await withDealer(A, async () => {});
  expect(await appDb.select().from(locations)).toEqual([]);
});
it("cannot insert a row for another dealer", async () => {
  await expect(withDealer(A, (tx) => tx.insert(locations).values({ dealerId: B, id: newId(), name: "X", kind: "branch" /* … */ })))
    .rejects.toThrow(/row-level security/);
});
it("withDealer rejects a non-uuid", async () => { await expect(withDealer("' or 1=1 --", async () => {})).rejects.toThrow(); });
it("suite variants normalize equal", () => {
  expect(new Set(["OFC 4", "#4", "Ste 4", "Suite 4", "Unit 4"].map(normalizeSuite))).toEqual(new Set(["4"]));
});
```
- [ ] **Step 2: Run** `pnpm --filter @dms/db test rls-leak`. Expected: FAIL.
- [ ] **Step 3: Implement** the schema, the migration (as `dms_owner`), `tenantRlsSql`, `withDealer` (app pool) and `normalizeSuite`, plus the per-worker test databases (see Testing setup).
- [ ] **Step 4: Run**. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(db): dealers, locations, memberships with forced RLS"`

### Task 5: Automatic dealer and location leak suites

**Files:**
- Create: `packages/db/src/registry.ts`, `packages/db/test/leak-suite.test.ts`

**Interfaces:**
- Produces:
  - `registerTenantTable(table: PgTable, sample: (dealerId: string, locationId: string) => Record<string, unknown>): void`;
  - `registerLocationTable(table: PgTable, sample: …): void` (also registers it as a tenant table);
  - `listLocationTables(): PgTable[]` (used by Task 9's API location suite).

- [ ] **Step 1: Write failing test.** For every registered table:
  - rows for A and B are inserted as owner;
  - under `withDealer(A)`, select returns only A, and an update or delete targeting B affects 0 rows.

  Catalog checks:
  - every table in schema `app` with a `dealer_id` column has `relrowsecurity` and `relforcerowsecurity` true;
  - every table with a `location_id` column is registered via `registerLocationTable`;
  - every table in `app` is either registered or listed in `GLOBAL_TABLES` (currently `users` and auth tables).
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement**, and register `locations`, `memberships` and `membership_locations`.
- [ ] **Step 4: Run**. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "test(db): automatic dealer and location leak suites"`

### Task 6: Field encryption and blind index (`packages/crypto`)

**Files:**
- Create: `packages/crypto/src/{keys,field,blind-index,index}.ts`, `packages/crypto/test/{field,blind-index,keys}.test.ts`, `packages/db/src/schema/keys.ts` (`data_keys(dealer_id, id, scope enum('dealer','customer','blind-index'), subject_id, key_version int, wrapped_key bytea, created_at, destroyed_at timestamptz null)`), migration `0002_keys.sql`

**Interfaces:**
- Produces:
  - `interface KeyProvider { wrap(k: Uint8Array): Promise<Uint8Array>; unwrap(w: Uint8Array): Promise<Uint8Array> }`; `EnvKeyProvider` (`MASTER_KEY`).
  - `getOrCreateCustomerKey(tx: AppTx, dealerId: string, customerId: string): Promise<Uint8Array>`; `destroyCustomerKey(tx, dealerId, customerId): Promise<void>`.
  - `type FieldAad = { dealerId: string; table: string; column: string; rowId: string }`.
  - `encryptField(key, plaintext: string, aad: FieldAad): string` (`v1.<iv>.<ct>.<tag>` base64url); `decryptField(key, ct: string, aad: FieldAad): string`.
  - `const Destroyed: unique symbol`; `readField(tx: AppTx, ctx: { dealerId: string; customerId: string }, ct: string, aad: FieldAad): Promise<string | typeof Destroyed>`.
  - `blindIndex(key: Uint8Array, value: string): string` (HMAC-SHA256 hex; strips spaces and dashes, uppercases).
  - `rotateMasterKey(oldProvider, newProvider)` (rewraps dealer keys only; data is untouched).

- [ ] **Step 1: Write failing tests**: `round-trips`; `AAD mismatch throws` (rowId changed); `same plaintext encrypts differently`; `tampered tag throws`; `shredded key decrypts to Destroyed`; `blind index stable per dealer ("123-45-6789" == "123 45 6789") and differs across dealers`; `master key rotation keeps data readable`; `key bytes are zeroed after use where possible`.
- [ ] **Step 2: Run** `pnpm --filter @dms/crypto test`. Expected: FAIL.
- [ ] **Step 3: Implement** with Node `crypto` `aes-256-gcm` and a 12-byte random IV. The dealer key is wrapped by the master key; customer and blind-index keys are wrapped by the dealer key. Register `data_keys` in the leak suite.
- [ ] **Step 4: Run**. Expected: PASS; coverage for `packages/crypto` ≥ 95%.
- [ ] **Step 5: Commit** `git commit -m "feat(crypto): envelope field encryption, per-customer keys, blind index"`

### Task 7: Hash-chained audit log

**Files:**
- Create: `packages/db/src/schema/audit.ts` (`audit_events(dealer_id, id, seq bigint, at, actor_user_id, location_id null, request_id, action, target, meta jsonb, prev_hash, hash)`, unique `(dealer_id, seq)`), migration `0003_audit.sql` (revoke UPDATE/DELETE/TRUNCATE from `dms_app`; trigger raising on UPDATE/DELETE), `packages/db/src/audit.ts`, `packages/db/test/audit.test.ts`

**Interfaces:**
- Produces:
  - `appendAudit(tx: AppTx, e: { actorUserId: string | null; locationId?: string; requestId?: string; action: AuditAction; target: string; meta?: Record<string, unknown> }): Promise<void>`;
  - `verifyAuditChain(dealerId: string): Promise<{ ok: true; count: number } | { ok: false; brokenAtSeq: number }>`;
  - `type AuditAction = "auth.login" | "auth.logout" | "auth.mfa_enrolled" | "auth.mfa_failed" | "auth.locked" | "pii.reveal" | "export.create" | "record.update" | "doc.view" | "entitlement.denied" | "license.installed" | "location.created" | "membership.changed"` (later plans extend it).
- Hashing:
  - hash = `sha256(prev_hash + canonicalJSON({seq, at, actor_user_id, location_id, request_id, action, target, meta}))`;
  - the first `prev_hash` is `"genesis:" + dealerId`;
  - appends are serialized with `pg_advisory_xact_lock(hashtext(dealer_id::text))`;
  - `meta` is rejected if any key, at any depth, satisfies `isSensitiveKey` (from `@dms/core`).

- [ ] **Step 1: Write failing tests**: `chain verifies after 3 appends`; `app role cannot update or delete`; `app role cannot truncate`; `tampering detected at seq 2`; `concurrent appends keep a gapless seq` (20 parallel appends); `meta with key ssn|dl|dob is rejected`; `meta allows deadline and middleName`.
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement**; register `audit_events` in the leak suite.
- [ ] **Step 4: Run**. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(db): append-only hash-chained audit log"`

### Task 8: Hardened Hono API with verified dealer context

**Files:**
- Create: `apps/api/src/{app,server,client}.ts`, `apps/api/src/middleware/{request-id,security-headers,error-handler,rate-limit,dealer-context}.ts`, `apps/api/src/routes/health.ts`, `apps/api/test/{dealer-context,hardening}.test.ts`

**Interfaces:**
- Consumes: `withDealer`, `memberships`, `@dms/core` errors and logger, `@dms/config`.
- Produces:
  - `createApp(deps: { config; clock; logger; db }): Hono`.
  - `c.get("requestId")`; `c.get("dealer")` = `{ dealerId: string; membershipId: string; role: Role }`, from header `X-Dealer-Id` verified against the user's active memberships.
  - `export type AppType` and an `hc<AppType>` client.
  - `GET /health` → `{ status: "ok" }`; `GET /ready` → checks the DB and S3.
- Hardening:
  - Hono `secureHeaders` (CSP `default-src 'self'`, `frame-ancestors 'none'`);
  - CORS allowlist = `DMS_WEB_ORIGIN`;
  - body limit 1 MB (uploads use presigned URLs later);
  - rate limiter (in-memory token bucket keyed by IP+route; Postgres-backed in Phase 3) applied to `/api/auth/*`;
  - error handler maps `AppError` → envelope, otherwise 500 `internal_error`;
  - the logger records method, route, status, ms and requestId, never bodies.

- [ ] **Step 1: Write failing tests**: `GET /health 200`; `dealer route without X-Dealer-Id → 400 dealer_required`; `non-member dealer → 403`; `disabled membership → 403`; `dealer switch does not leak` (a user in A and B; an A request then a B request on one app instance; the second response contains only B rows); `unknown error returns 500 with requestId and no stack`; `response has security headers`; `oversized body → 413`; `disallowed origin gets no CORS headers`.
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement**. Every dealer-scoped handler runs inside `withDealer`. Use a test-only session stub until Task 10.
- [ ] **Step 4: Run**. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(api): hardened hono app with verified dealer context"`

### Task 9: Location context and API location leak suite

**Files:**
- Create: `apps/api/src/middleware/location-context.ts`, `apps/api/src/scope.ts`, `packages/db/src/schema/license-documents.ts` (`license_documents(dealer_id, id, location_id null, kind enum('dmv_license','bond','sellers_permit','business_license','zoning_letter','lease','fbns','other'), number, issued_on date, expires_on date, file_key, created_at)`), migration `0004_license_documents.sql`, `apps/api/src/routes/license-documents.ts` (list/create/get), `apps/api/test/location-scope.test.ts`, `apps/api/test/location-suite.test.ts`

**Interfaces:**
- Consumes: Task 8 dealer context; `registerLocationTable`, `listLocationTables`.
- Produces:
  - `requireLocation()`: reads `X-Location-Id` and returns 403 `location_forbidden` unless the role is `owner`/`auditor` or the membership lists that location. Sets `c.get("location") = { locationId }`.
  - `allowedLocationIds(c): Promise<string[] | "all">`.
  - `scopeToLocations(table, ids)`: the Drizzle `where` fragment used by every location-scoped query. Dealer-level rows with `location_id null` are visible to all members.
  - `auditor` is read-only: any non-GET returns 403 `read_only_role`.

- [ ] **Step 1: Write failing tests**: `sales at A cannot read B by id` (GET `/license-documents/:idB` with `X-Location-Id: A` → 404; with `X-Location-Id: B` → 403); `sales list shows only A rows`; `owner sees A and B`; `create with location B by sales at A → 403`; `auditor cannot write`. `location-suite.test.ts` iterates `listLocationTables()` and, for each table with a list route, asserts that sales at A never receives a B row (tables without routes yet are skipped and listed in the output).
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement**; register `license_documents` via `registerLocationTable`.
- [ ] **Step 4: Run**. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(api): location context, scoping and license documents"`

### Task 10: Login with mandatory MFA, step-up and roles

**Files:**
- Create: `apps/api/src/auth.ts`, `apps/api/src/middleware/{require-mfa,require-recent-mfa,require-role}.ts`, migration `0005_auth.sql`, `apps/api/test/auth.test.ts`
- `auth.ts` uses Better Auth with:
  - email + password (min 12, max 128 characters);
  - `twoFactor` TOTP with 10 one-time recovery codes, stored hashed;
  - `passkey`;
  - cookie sessions for web, `trustedOrigins = [DMS_WEB_ORIGIN]`;
  - bearer tokens enabled for future native apps.
- Create: `apps/api/src/auth/{lockout,session-policy}.ts`, `docs/adr/0004-auth-session-policy.md`
- Modify: `apps/api/src/app.ts` (mount `/api/auth/*`, remove the Task 8 stub)
- **Custom code, not configuration.** Better Auth doesn't provide two of the required rules as settings:
  - **TOTP lockout:** `auth_failures(user_id, kind, count, window_start, locked_until)`, updated from a Better Auth `hooks.after` on the TOTP-verify endpoint. 5 failures in 15 min → locked 15 min → 429.
  - **Idle + absolute session limits:** `requireSession` checks `last_seen_at` (Better Auth session `additionalFields`, updated at most once a minute) for 30-min idle, and `created_at` for the 12-h absolute cap.
  - First check the current Better Auth docs. Where a built-in option exactly fits (`rateLimit` for sign-in, `session.expiresIn`), use it. Record which parts are custom in ADR 0004.

**Interfaces:**
- Produces:
  - `requireMfa()`: 403 `{ error: "mfa_required" }` unless a second factor was completed this session.
  - `requireRecentMfa(maxAgeMs = 600_000)`: 403 `{ error: "step_up_required" }`.
  - `requireRole(...roles: Role[])`: 403 `{ error: "forbidden" }`.
  - Sessions: absolute 12 h, idle 30 min.
  - Audit events: `auth.login`, `auth.logout`, `auth.mfa_enrolled`, `auth.mfa_failed`, `auth.locked`.

- [ ] **Step 1: Write failing tests**: `unauthenticated → 401`; `api rejects non-MFA session` (signed in, no second factor, direct call to a dealer route → 403 `mfa_required`); `TOTP-verified session passes`; `recovery code works once`; `sales blocked from requireRole("owner","fi")`; `5 failed TOTP codes lock 15 minutes → 429` (plan's security default); `login with unknown email takes same path as wrong password` (same status and body); `idle session expires after 30 min` (FixedClock); `step-up required after 10 min`; `bearer token from a TOTP-verified login works for API calls`; `password under 12 chars rejected`.
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement**. Cookies are `httpOnly`, `secure` in production, `SameSite=Lax`. Only auth, MFA enrollment and health skip `requireMfa`.
- [ ] **Step 4: Run**. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat(auth): mandatory MFA, step-up, roles, cookie and bearer sessions"`

### Task 11: Signed license keys, entitlements and the `ee/` locations capability

**Files:**
- Create: `packages/entitlements/src/{catalog,plans,license,check,index}.ts`, `packages/entitlements/plans.yaml`, `packages/entitlements/keys/public.pem` (placeholder dev public key; the production key is added at release), `packages/entitlements/test/{license,check,plans}.test.ts`, `packages/entitlements/test/helpers/keys.ts` (throwaway Ed25519 pair)
- `plans.yaml` (working draft, values from spec §5.8):
  - `community`: all `core.*`, `maxLocations: 1`, $0;
  - `hosted_core`: $49/mo;
  - `hosted_pro`: $99/mo;
  - `selfhost_pro`: $50/mo;
  - `extra_location`: $25/mo;
  - annual discount 17%;
  - prices in cents.
- Create: `packages/ee/src/locations.ts` (header `// SPDX-License-Identifier: LicenseRef-DMS-Commercial`), `packages/ee/src/index.ts`, `packages/ee/CLAUDE.md` (already present)
- Create: `apps/api/src/middleware/require-feature.ts`, `apps/api/src/routes/{locations,license,entitlements}.ts`, `apps/api/test/entitlements.test.ts`
- Create: `packages/db/src/schema/licenses.ts` (`dealer_licenses(dealer_id, id, token text, license_id, plan, expires_at, installed_at, installed_by)`), migration `0006_licenses.sql`

**Interfaces:**
- Produces:
  - `type Feature = "core.compliance" | "core.security" | "core.first_location" | "core.export" | "ee.additional_locations" | "ee.bhph" | "ee.crm_automation" | "ee.accounting_sync" | "ee.dashboards" | "ee.sso" | "ee.custom_roles" | "ee.white_label" | "ee.partner_connectors"`.
  - `type LicensePayload = { v: 1; licenseId: string; subject: { dealerId?: string; install?: string }; plan: "community" | "pro" | "promotion"; features: Feature[]; extraLocations: number; issuedAt: string; expiresAt: string }`.
  - `verifyLicense(token: string, publicKeyPem: string, now: Date, expect?: { dealerId?: string; install?: string }): { ok: true; payload: LicensePayload } | { ok: false; reason: "bad_signature" | "expired" | "malformed" | "wrong_subject" }`.
    - Returns `wrong_subject` when `expect` names a dealer or install that differs from `payload.subject`.
    - `resolveEntitlements` always passes `{ dealerId }`.
    - Token format: `base64url(payload).base64url(ed25519Signature)`.
  - `resolveEntitlements(input: { token: string | null; dealerId: string; now: Date }): { features: Set<Feature>; maxLocations: number; plan: string; expiresAt: string | null; daysLeft: number | null }`. Returns Community when there is no token, or it is invalid or expired; `core.*` is always present.
  - `requireFeature(f: Feature)`: 402 `{ error: "upgrade_required", feature }` + audit `entitlement.denied`.
  - `GET /entitlements`: the current plan, features, maxLocations and daysLeft (used by the web banner).
  - `POST /locations` (owner): creates the first location in core. When the dealer already has ≥ 1 location, it delegates to `ee` `createAdditionalLocation(...)`, which requires `ee.additional_locations` and `count < maxLocations`.
  - `POST /license` (owner, `requireRecentMfa`): installs a token after `verifyLicense`; audit `license.installed`.

- [ ] **Step 1: Write failing tests**
```ts
it("valid signed key verifies", () => { expect(verifyLicense(sign(payload), pub, now).ok).toBe(true); });
it("tampered payload fails", () => { expect(verifyLicense(tamper(sign(payload)), pub, now)).toEqual({ ok: false, reason: "bad_signature" }); });
it("key for another dealer is rejected", () => { expect(verifyLicense(sign({ ...payload, subject: { dealerId: B } }), pub, now, { dealerId: A }).ok).toBe(false); });
it("expired promotion key falls back to Community", () => {
  const e = resolveEntitlements({ token: sign({ ...promo, expiresAt: "2026-01-01T00:00:00Z" }), dealerId, now });
  expect(e.plan).toBe("community"); expect(e.maxLocations).toBe(1);
});
it("core features present with no key", () => { expect([...resolveEntitlements({ token: null, dealerId, now }).features]).toEqual(expect.arrayContaining(["core.compliance","core.security","core.first_location","core.export"])); });
it("plans.yaml that removes a core feature is rejected", () => { expect(() => loadPlans(fixtureWithoutCoreExport)).toThrow(); });
it("no signing code outside test helpers", () => { expect(grepSrc(/crypto\.sign\(|generateKeyPair/)).toEqual([]); });
```
  API tests: `first location created without any key`; `second location → 402 with no key, entitlement.denied audited`; `second location succeeds with promotion key`; `pro key with extraLocations: 1 allows 2 locations, blocks the 3rd`; `export route works with no key`; `after promotion expiry existing locations stay readable`.
- [ ] **Step 2: Run** `pnpm --filter @dms/entitlements test && pnpm --filter api test entitlements`. Expected: FAIL.
- [ ] **Step 3: Implement** with Node `crypto` Ed25519: `generateKeyPairSync("ed25519")` only in test helpers, `crypto.verify(null, …)` in `license.ts`. Zod-validate the payload and `plans.yaml`. Register `dealer_licenses` in the leak suite.
- [ ] **Step 4: Run**. Expected: PASS; coverage for `packages/entitlements` ≥ 95%.
- [ ] **Step 5: Commit** `git commit -m "feat: signed license keys, entitlements and ee additional-locations capability"`

### Task 12: Customers with masked PII and logged reveal

**Files:**
- Create: `packages/db/src/schema/customers.ts` (`customers(dealer_id, id, first_name, last_name, phone, email, ssn_ct, ssn_bidx, dl_ct, dl_state char(2), dl_bidx, dob_ct, preferred_language enum('en','es','zh','tl','vi','ko') default 'en', created_at, updated_at)`; dealer-wide, not location-scoped), migration `0007_customers.sql`, `packages/contracts/src/customers.ts` (shared Zod schemas used by API and web), `apps/api/src/routes/customers.ts`, `apps/api/test/customers.test.ts`

**Interfaces:**
- Consumes: Task 6 crypto, `appendAudit`, `requireRole`, `requireRecentMfa`.
- Produces:
  - `POST /customers` (Zod: SSN `^\d{3}-?\d{2}-?\d{4}$`, DL `^[A-Z0-9]{5,15}$`, phone E.164);
  - `GET /customers/:id` → masked (`"***-**-6789"`, `"*****4321"`, DOB as year only);
  - `POST /customers/:id/reveal` (`owner`/`fi` + `requireRecentMfa`) → full values + `pii.reveal`, with `meta.fields` listing the revealed field names only;
  - `GET /customers?ssn=` via blind index;
  - `GET /customers?q=` (name/phone/email prefix, paginated: `limit` ≤ 100, cursor = UUIDv7).

- [ ] **Step 1: Write failing tests**: `sales sees masked SSN`; `fi reveal returns full SSN and audits`; `reveal needs recent MFA`; `sales reveal → 403, no audit row`; `lookup by SSN ignores dashes`; `shredded customer reads as destroyed` (200, `{ ssn: "destroyed" }`); `create customer logs no ssn` (capture logger output); `list is cursor-paginated and capped at 100`.
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement**; register `customers` in the leak suite; never return or log `*_ct`.
- [ ] **Step 4: Run**. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: customers with encrypted PII, masking and audited reveal"`

### Task 13: Fast, wrap-ready web shell with login, MFA, dealer and location switchers

**Files:**
- Create: `packages/platform/src/{index,web}.ts`, with `interface Platform`:
  - `pickFile(accept: string[]): Promise<File | null>`
  - `scanBarcode(): Promise<string | null>`
  - `secureStore: { get(k: string): Promise<string | null>; set(k: string, v: string): Promise<void>; delete(k: string): Promise<void> }`
  - `print(pdf: Blob): Promise<void>`
  - `openExternal(url: string): Promise<void>`

  Plus `packages/platform/test/web.test.ts`.
- Create: `packages/i18n/src/{index,en,es}.ts` (typed keys; `t(key, vars)`; `es` falls back to `en` per key; `Intl` for numbers and dates), `packages/i18n/test/i18n.test.ts`
- Create: `packages/ui/` (shadcn components, `brand.css` tokens, light and dark themes)
- Create: `apps/web/`:
  - Vite React 19, with TanStack Router file routes `__root`, `login`, `mfa`, `mfa/recovery`, `_app/index`, `_app/customers`, `_app/customers/$id`, `_app/settings/locations`, `_app/settings/license`;
  - `apps/web/src/lib/api.ts` (typed `hc` client; sends `X-Dealer-Id` and `X-Location-Id`; maps the error envelope to toasts);
  - `apps/web/src/lib/idle.ts` (30-min idle → lock screen);
  - `apps/web/e2e/{login,locations,a11y}.spec.ts`, `playwright.config.ts`;
  - `scripts/size-check.ts` and `apps/web/budgets.json`: gzip each built JS chunk with Node `zlib` and compare it to the budgets; adds the root script `pnpm size` and the CI size step.
- Modify: `packages/brand/scripts/sync.ts`: render `icon-192.png`, `icon-512.png` and `apple-touch-icon.png` from `logo-mark.svg` with Playwright (headless Chromium screenshot; no image library), and add them to the manifest.
- Modify: `biome.json` (`noRestrictedGlobals: ["navigator"]` everywhere except `packages/platform/**`)

**Interfaces:**
- Consumes: the `AppType` client; auth, customers, locations, license and entitlements routes; `@dms/brand`; `@dms/i18n`.
- Produces:
  - The app shell: sidebar with Inventory, Deals, Customers, Records, Settings; the brand logo from `@dms/brand`; a language toggle EN/ES.
  - The dealer switcher (`X-Dealer-Id`) and the location switcher (`X-Location-Id`, listing only allowed locations).
  - A promotion/plan banner from `GET /entitlements` (shows days left when ≤ 90).
  - The `usePlatform()` hook.
- Speed:
  - route-level code splitting;
  - TanStack Query `staleTime` 30 s for lists;
  - route loaders prefetch on link hover;
  - optimistic create-customer;
  - no UI library beyond shadcn/Radix.

- [ ] **Step 1: Write failing tests**:
  - Unit: `web platform secureStore round-trips`; `es falls back to en for missing key`; `every t() key used in apps/web exists in en`.
  - E2E `login.spec.ts`: sign up a synthetic user → forced to `/mfa` → enroll TOTP → dashboard; `/` before MFA redirects to `/mfa`; the customers page shows a masked SSN; switching to ES changes the sidebar labels.
  - E2E `locations.spec.ts`: the owner installs a test promotion key (signed by the throwaway test key pair, with the test public key configured) and creates a second location; a sales user assigned to location A sees only A in the switcher.
  - E2E `a11y.spec.ts`: axe has no serious or critical violations on login, mfa, dashboard, customers and settings, in light and dark mode.
- [ ] **Step 2: Run** `pnpm --filter web test:e2e`. Expected: FAIL.
- [ ] **Step 3: Implement** with shadcn `Form`, `Input`, `Button`, `Card`, `Select`, `Dialog`, `Sonner`.
- [ ] **Step 4: Run** `pnpm lint && pnpm --filter web test:e2e && pnpm size`. Expected: PASS. Lint proves there is no `navigator` use outside `packages/platform`; `size` proves the JS budgets.
- [ ] **Step 5: Commit** `git commit -m "feat(web): fast wrap-ready SPA shell with MFA, i18n and dealer/location switchers"`

### Task 14: Background worker

**Files:**
- Create: `apps/worker/src/index.ts`, `apps/worker/src/jobs/{audit-verify,license-expiry,entitlement-expiry}.ts`, `apps/worker/test/jobs.test.ts`, `packages/db/src/schema/notifications.ts`, migration `0008_notifications.sql`
- Modify: `docker/compose.dev.yml` (add `api`, `web` and `worker` for `pnpm dev:up --full`)

**Interfaces:**
- Consumes: `verifyAuditChain`, `license_documents`, `dealer_licenses`, `Clock`.
- Produces:
  - `registerJobs(boss: PgBoss, deps): Promise<void>`.
  - Job `audit.verify` (daily per dealer; creates an owner notification and an error log line when `ok: false`).
  - Job `license.expiry` (daily; notifications at **90, 30 and 7 days** before a license document's `expires_on`, once each).
  - Job `entitlement.expiry` (daily; same 90/30/7 reminders for the promotion or paid license key).
  - Table `notifications(dealer_id, id, location_id null, kind, body_key, body_vars jsonb, created_at, read_at)`. Bodies are i18n keys, not text.

- [ ] **Step 1: Write failing tests**: `audit.verify ok on intact chain`; `audit.verify alerts on tampered chain`; `license.expiry notifies at 90/30/7 days exactly once each` (FixedClock walking 100 days); `expired license document is reported as expired`; `promotion key reminder at 30 days`; `jobs run under withDealer per dealer`.
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement** with pg-boss (schema `pgboss`, owner URL). Handlers use `withDealer`. Register `notifications` in the leak suite.
- [ ] **Step 4: Run** `pnpm test` at root. Expected: all PASS; `pnpm dev:up --full` serves `http://localhost:5173`.
- [ ] **Step 5: Commit** `git commit -m "feat(worker): audit verification and license/promotion expiry reminders"`

### Task 15: Synthetic seed data, backup/restore and Plan 1 acceptance

**Files:**
- Create: `packages/db/src/seed.ts` (`pnpm db:seed`; deterministic). It seeds:
  - dealer "Example Motors Inc." with locations "Main Lot" and "Second Lot";
  - users owner/fi/sales/auditor `@example.test`, with a dev-only TOTP secret printed once;
  - 200 synthetic customers;
  - license documents with varied expiry dates.

  It refuses to run when `NODE_ENV=production`.
- Create: `scripts/db-backup.sh` (`pg_dump -Fc` to `backups/<timestamp>.dump` + a sha256 file; MinIO mirror to `backups/objects/`) and `scripts/db-restore.sh` (restore into a new DB `dms_restore_check`, run `verifyAuditChain` for every dealer, print counts)
- Create: `scripts/test/review-focus.test.ts`, `scripts/perf/api-p95.ts` (a loop using `fetch`, no load-testing library; reports p95 for `GET /customers` on seed data) and the root script `pnpm perf:api`
- The backup/restore test is `scripts/test/backup-restore.slow.test.ts`, so it runs under `pnpm test:slow` (defined in Task 1)
- Create: `docs/runbooks/local-dev.md` (setup, reset, seed, backup/restore, common errors), `docs/runbooks/key-handling.md` (MASTER_KEY generation, storage and rotation; license public key)

- [ ] **Step 1: Write failing tests**: `seed is deterministic` (two runs produce the same row hashes); `seed refuses production`; `review focus tests exist` (every name in this plan's Review Focus is found in the test files); `backup then restore keeps audit chain valid` (integration, tagged `slow`).
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** `pnpm verify && pnpm test:slow && pnpm perf:api`. Expected: PASS, p95 ≤ 150 ms.
- [ ] **Step 5: Commit** `git commit -m "chore: synthetic seed, backup/restore check and plan 1 acceptance"`. Then write `docs/progress/plan-1-report.md` (tasks, test counts, budgets measured, deferred items) and stop.

---

## Later plans (each written after the previous one ships)

2. **Dealer and location onboarding:**
   - resumable wizards (spec §5.7) and a readiness checklist;
   - required-document gates;
   - **per-location business hours and closure calendar** (needed for the CARS cancellation deadline, CA-CARS-03);
   - posted-notice print pack including the 36-pt CARS sign (CA-CARS-10).
3. **Inventory & NMVTIS gate:**
   - vPIC decode/cache;
   - location-scoped vehicles and recon costs;
   - the vehicle state machine;
   - dated NMVTIS PDF upload and the CA warning label;
   - trade-in intake.
4. **Compliance engine & CA pack v0:**
   - dated, cited YAML rules applied per location; a verified rule is a hard stop, others are acknowledged warnings;
   - fees (doc fee $85/$70, CA-CARS-17), deadlines and CARS eligibility;
   - restocking fee and total price (CA-CARS-02, 03, 05, 11);
   - golden tests.
5. **Documents:**
   - Buyer's Guide EN/ES;
   - retail purchase contract with the CARS first-page statement, "not a governmental fee" line, no application fee and returned-check fee ≤ $15 (CA-CARS-09);
   - the "3-Day Right to Cancel Used Car Purchase or Lease" document in the deal language (CA-CARS-08, 15);
   - odometer statement and privacy notice;
   - signed-scan finalization.
6. **Desking & deals:**
   - cash and buyer-arranged-loan deals per location;
   - `executed_at` vs `delivered_at` (CA-CARS-01) and odometer at delivery and return (CA-CARS-04);
   - dated tax table and the doc-fee cap;
   - total-of-payments quotes (CA-CARS-12);
   - add-ons rejected in Phase 1;
   - the CARS cancellation flow with 48-h refund timer, trade-in return, damage documentation and fee calculation (CA-CARS-06, 07, 18);
   - OFAC screen and the 8300 alert.
7. **Records:**
   - write-once deal jacket, hash ledger, legal hold;
   - retention timers (2 / 3 / 7 years, CA-CARS-16);
   - per-location DMV inspection export;
   - the crypto-shred job.
8. **Handoff, comms, feed & reports:**
   - eROS worksheet export and TLP deadlines;
   - the first-written-communication log with total price (CA-CARS-11);
   - CSV feed with sold-unit removal and 48-h reminders;
   - cross-location reports.
9. **(Phase 2) Native apps:** Tauri 2 `apps/desktop` for Windows, macOS, Linux and Android, with the `packages/platform` Tauri implementation, keychain token storage, signed builds and auto-update.

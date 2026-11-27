# 0001: Stack, tool versions and tenancy model

- **Status:** accepted
- **Date:** 2026-11-27
- **Deciders:** owner (stack confirmed, spec §7), builder (versions)
- **Plan task:** Plan 1, Task 1

## Context
Spec §4b, §4c and §5.1–§5.3 pick the stack and the tenancy model. Plan 1's Global Constraints fix
the language settings, and its Approved dependencies list limits what may be installed. Task 1
asks us to pin gitleaks to the version the owner installed and to record it here.

## Decision
**Stack:** pnpm workspaces + Turborepo, TypeScript strict (`noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`), Biome, Vitest, Playwright; Hono + Zod API, Drizzle + Postgres 16,
Better Auth, pg-boss, pino; Vite + React 19 SPA with TanStack Router + Query, Tailwind v4 +
shadcn/ui. Workspace packages export TypeScript source (`exports: ./src/index.ts`) and are run
with `tsx`/Vitest, so there is no build step between packages.

**Tenancy:** shared tables. The dealer (legal entity) is the tenant; every tenant table has
`dealer_id`, with RLS enabled and forced, policy
`dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid`. The app connects as
`dms_app` (NOBYPASSRLS); migrations run as `dms_owner`. Locations are scoped in the API layer.

**Pinned versions (Task 1):**

| Tool | Version | Note |
|---|---|---|
| Node | 22 (`.nvmrc`, `engines`) | owner has 22.23.5 |
| pnpm | 12.23.0 (`packageManager`) | owner's installed version |
| TypeScript | **6.0.3** | 7.0 (native compiler) exists; we stay on 6.x until the tools that use the TypeScript JS API (e.g. TanStack Router plugin, drizzle-kit) support 7 |
| @types/node | 22.20.7 | matches the Node 22 runtime, not the latest 26.x types |
| turbo / tsx / vitest / biome / zod | 2.11.13 / 4.23.15 / 5.1.2 / 2.6.9 / 4.6.7 | exact versions, no ranges |
| **gitleaks** | **8.30.1** | owner's installed version; CI downloads this release and checks sha256 `551f6fc8…70eb` |

**Supply chain:**
- Dependencies are pinned exactly and installed with `--frozen-lockfile` in CI.
- GitHub Actions are pinned to full commit SHAs, with the tag in a comment (Dependabot updates both).
- `minimumReleaseAge: 1440` (owner decision, 2026-11-27): pnpm refuses any version published less
  than 24 hours ago, so a hijacked release has a day to be caught before we can install it.
  Dependabot's 7-day cooldown sits on top of this. To take an urgent security fix sooner, add it to
  `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` with a comment and the date.
- pnpm 12 blocks dependency build scripts by default. `pnpm-workspace.yaml` → `allowBuilds` lists each decision; `esbuild: false`, because esbuild ships its binary as an optional dependency and needs no postinstall.

## Consequences
- Every later task reuses the root scripts: `build`, `test`, `test:slow`, `test:e2e`, `lint`,
  `typecheck`, `verify`, `brand:sync`.
- `test` excludes `*.slow.test.ts`; `test:slow` runs only those.
- Upgrading TypeScript to 7 is a separate, deliberate change. Revisit it when Plan 1 is done.
- When the owner upgrades gitleaks, update `GITLEAKS_VERSION` and `GITLEAKS_SHA256` in
  `.github/workflows/ci.yml` and this table.

## Alternatives considered
- Next.js / SvelteKit (spec §4b); schema-per-tenant or DB-per-tenant (spec §4c).
- Floating version ranges: rejected for reproducibility and supply-chain safety.

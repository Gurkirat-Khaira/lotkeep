# 0003: Placeholder brand isolated in brand/

- **Status:** accepted
- **Date:** 2026-11-27
- **Deciders:** owner (placeholder name), builder (mechanism)
- **Plan task:** Plan 1, Task 1

## Context
The product name is not final (spec §5.8a, §8): it still needs trademark, domain and npm checks.
A rename must not mean a search-and-replace across the codebase.

## Decision
- The name, slug, tagline, colors and logos live only in `brand/brand.json` and `brand/assets/*.svg`.
- Code uses neutral names (`@dms/*`, `DMS_*`, database `dms`, internal id `PRODUCT.id = "dms"`) and
  reads the brand through `@dms/brand`, which validates `brand.json` with a strict Zod schema.
  `brand.schema.json` is editor hints only.
- `pnpm brand:sync` regenerates the brand-derived files:
  - `apps/web/public/favicon.svg` and `manifest.webmanifest`;
  - `packages/ui/src/brand.css` (`--brand-*` variables);
  - the generated header block in `README.md`;
  - PNG icons, from Task 13.

  It then runs the repo-hygiene test.
- The hygiene test fails if the exact, case-sensitive brand name appears outside `brand/**`,
  `docs/**`, `README.md`, `TRADEMARKS.md`, `*.svg` and `apps/web/public/**`.
- Workflows and docs use `${{ github.repository }}` and relative links (for example
  `../../security/advisories/new`), so a GitHub rename needs no edits there.

## Consequences
- Rebrand = edit `brand.json`, swap the SVGs, `pnpm brand:sync`, `gh repo rename` (see
  `brand/README.md`).
- The lowercase slug may still appear in a few places (the planned repo name); a rename updates them.
- Generated files are committed so the web app builds without running sync first.

## Alternatives considered
- Hard-coding the name with a later find-and-replace: rejected (error-prone; it also leaks into
  package names, env vars and databases).

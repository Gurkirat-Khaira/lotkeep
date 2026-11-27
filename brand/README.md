# Branding (placeholder)

**Lotkeep** is a working name. The final product name has not been chosen. Everything brand-related lives in this folder, so a rename is a small, mechanical change.

## The rule
The product name, colors and logos appear **only** in `brand/`. Code, package names (`@dms/*`), env vars (`DMS_*`), database names (`dms`), Docker services and CSS use neutral names. The UI reads the brand at build time through `packages/brand`. A repo-hygiene test fails if the brand name shows up anywhere else. The only exceptions are `brand/**`, `docs/**`, `README.md`, `TRADEMARKS.md`, `*.svg` and the generated `apps/web/public/**`.

## Files
| File | Use |
|---|---|
| `brand.json` | name, slug, tagline, GitHub repo, URLs, emails, colors, font, logo paths |
| `brand.schema.json` | editor hints only (autocomplete in VS Code). The real validator is the Zod schema in `@dms/brand`, which the tests run. If you add a field, update both. |
| `assets/logo-mark.svg` | app icon / avatar (64×64 tile) |
| `assets/logo-mark-mono.svg` | single color, uses `currentColor` (inline it) |
| `assets/logo-wordmark.svg` / `-dark.svg` | header logo on light / dark backgrounds (text is outlined, so no font is needed) |
| `assets/favicon.svg` | browser tab |
| `assets/preview.png` | preview of all of the above |
| `generate-placeholder-logo.py` | how the placeholder was made (Inter, SIL OFL) |

## How to rebrand
1. Check that the name is free: GitHub, the USPTO trademark search (class 9 / 42 software), the domain, and the npm org.
2. Edit `brand.json`: name, shortName, slug, tagline, github.repo, colors. Set `status` to `"final"`.
3. Replace the five SVGs. Keep the file names, a square 64×64 viewBox for the mark, and outlined text.
4. Run `pnpm brand:sync`. It regenerates the favicon, PNG icons (rendered with Playwright, from Plan 1 Task 13), the PWA manifest, the README header and the CSS color tokens, then runs the brand hygiene test. Tauri app icons join this step in Phase 2.

SVGs must be clean: no `<metadata>` and no C2PA/provenance blocks, and the mark stays under 2 KB. Some copy and sync tools inject these, and a hygiene test checks for them.
5. Rename the GitHub repo (`gh repo rename <slug>`; GitHub redirects the old URL).
6. Commit: `chore(brand): rename to <Name>`.

# apps/web: React SPA (wrap-ready)

- **Client-only** Vite + React 19. No SSR and no Node APIs. It will be wrapped by Tauri (Windows/macOS/Linux/Android) in Phase 2.
- **Device features** (files, camera, barcode, print, secure storage, opening links) go only through `usePlatform()` from `@dms/platform`. Biome blocks `navigator` elsewhere.
- **Data:** the typed `hc` client in `src/lib/api.ts` (adds `X-Dealer-Id` / `X-Location-Id`); TanStack Query; route loaders prefetch; optimistic mutations where safe.
- **Text:** every user-facing string is `t("key")` from `@dms/i18n`. Format money with `formatUSD` and dates with `Intl` in the location's timezone.
- **Brand:** logo, name and colors come from `@dms/brand` and CSS tokens. Never type the product name.
- **UI:** shadcn/ui components in `packages/ui`. Support light and dark. Keyboard first; visible focus.
- **PII:** masked by default; reveal needs step-up MFA; never store PII in localStorage, the URL or query cache persistence.
- **Budgets:** initial JS ≤ 250 KB gzip, route chunk ≤ 100 KB (`pnpm size`). Axe in E2E: zero serious or critical. Run the `ui-reviewer` agent after UI tasks.

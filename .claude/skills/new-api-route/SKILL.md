---
name: new-api-route
description: "Use whenever adding or changing an API route: shared Zod schema, MFA/role/location/feature guards, withDealer, audit event and tests."
argument-hint: "<METHOD /path> <purpose>"
---
Add route $ARGUMENTS in `apps/api/src/routes/`:

1. Put the Zod input/output schemas in `packages/contracts/src/` (shared with web). Validate params, query and body.
2. Guards in order: `requireMfa()` → `requireRole(...)` → `requireLocation()` if location-scoped → `requireFeature("ee.x")` if it is a paid feature → `requireRecentMfa()` for reveal, export, license or other dangerous actions.
3. The handler runs inside `withDealer`. Location-scoped queries use `scopeToLocations`. Get-by-id returns 404 (not 403) for rows outside scope.
4. Writes call `appendAudit` with an action from `AuditAction` (extend the union if needed). `meta` contains no PII.
5. Throw `AppError` for errors (snake_case codes). Lists are cursor-paginated with `limit` ≤ 100.
6. Tests first, in `apps/api/test/`: happy path, wrong role, other dealer, other location, no MFA and invalid input. Plus 402 without the entitlement for `ee` routes.
7. Export the route type through `AppType` so the web client is typed. Run `pnpm verify`.

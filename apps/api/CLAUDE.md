# apps/api: Hono API

- Use `/new-api-route` for every route.
- Guard order: `requireMfa` → `requireRole` → `requireLocation` → `requireFeature` → `requireRecentMfa`.
- Handlers run inside `withDealer`. Location-scoped reads use `scopeToLocations`. Out-of-scope get-by-id → 404.
- Validate every input with Zod from `@dms/contracts`. Return typed JSON; export route types through `AppType` for the web `hc` client.
- Errors: throw `AppError`. The error handler produces `{ error, message?, details?, requestId }`. Never return stacks, SQL or PII.
- Logging: use `c.var.logger` (pino, redacted). Never log request bodies on customer, deal or document routes.
- Writes append an audit event. Time comes from the injected `Clock`.
- Tests use `createApp(testDeps)` with `FixedClock` and per-worker test DBs. Cover: other dealer, other location, wrong role, no MFA, invalid input.

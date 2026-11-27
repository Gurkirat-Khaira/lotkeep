# 0005: Sanitized database errors, and per-worker test databases

- **Status:** accepted
- **Date:** 2026-11-27
- **Deciders:** builder (owner to review)
- **Plan task:** Plan 1, Task 4

## Context
Drizzle 0.45 wraps every failed query in a `DrizzleQueryError`. Its `message` contains the SQL
**and the parameter values**, and it keeps those values in a `params` field. Postgres errors also
carry values: in `detail` (`Key (email)=(…) already exists`) and in some messages
(`invalid input syntax for type uuid: "…"`). Our logger redacts by key name, so a logged error
would leak customer data. That breaks the CLAUDE.md PII rule.

Separately, the plan's testing setup clones a migrated `dms_test_template` per Vitest worker.
Grants and default privileges are per database, and database ACLs are not copied by
`CREATE DATABASE … TEMPLATE` (Task 2 security review).

## Decision
**Database errors**
- `withDealer` rethrows every database failure as `DbError` (`packages/db/src/errors.ts`).
- A `DbError` has only the SQLSTATE (`sqlState`), a fixed description, and the table, column and
  constraint names. It never carries the query, the parameters, the Postgres message or `detail`.
- RLS violations surface as `42501`, with the message "insufficient privilege (permission denied
  or row-level security policy)".
- Later code that queries outside `withDealer` (migrations, seeds, the worker) must use
  `toDbError` before logging.

**Migrations and test databases**
- `0000_bootstrap.sql` creates schema `app` (`IF NOT EXISTS`), its grants, default privileges and
  `citext` (in schema `app`, since `dms_app` has no access to `public`). Every database built from
  migrations is therefore self-contained; the container init script still creates the roles.
- `dms_owner` has `CREATEDB` (set in Task 2) so tests can create databases.
- Vitest `globalSetup` drops stale `dms_test_*` databases owned by `dms_owner`, creates and
  migrates `dms_test_template`, and revokes `PUBLIC` rights on it.
- Each worker clones the template to `dms_test_<VITEST_POOL_ID>`, revokes `PUBLIC`, and grants
  `CONNECT` to `dms_app`.
- The worker's app pool has **one connection**, so every test reuses a connection after a
  transaction (Review Focus #1).
- FORCE RLS also applies to the table owner, so owner-side seeding sets `app.dealer_id`
  (`asOwner`).

**Global `users` table (security review)**
- `users` has no RLS. Migration `0002` revokes UPDATE and DELETE on it from `dms_app`, so one
  dealer's transaction can't change or remove another dealer's login. Reading and inserting are
  still allowed.
- Task 10 (auth) must give Better Auth narrow grants or `SECURITY DEFINER` functions rather than
  the owner pool.
- Before a dealer is chosen, login needs "which dealers is this user in?", but forced RLS hides
  memberships. Plan a narrow `SECURITY DEFINER app.user_dealers(user_id)` in Task 8/10. Never use
  the owner pool in a handler.
- `getAppDb` isn't exported from `@dms/db`, so handlers can't query outside `withDealer`.
- citext's functions are owned by the bootstrap superuser with PUBLIC EXECUTE. They have no side
  effects, so this is accepted.

## Consequences
- Error logs show what failed (constraint, SQLSTATE), not with which values. Debugging relies on
  the request ID and the constraint name.
- Two packages that run DB tests at the same time would fight over `dms_test_template`. When
  `apps/api` gets DB tests (Task 8), give each package its own template and worker prefix.
- CI runs `drizzle-kit check`, so migrations can't drift from the schema.

## Alternatives considered
- Logging only `err.cause`: Postgres `detail` and some messages still carry values.
- One shared test database with truncation: serial tests, and leftover rows could hide leaks.

---
name: verify
description: "Use before saying work is done or before committing: run lint, typecheck, tests, e2e and budgets, and report the actual results."
---
Run, in order, and stop at the first failure to diagnose it (use superpowers:systematic-debugging):

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm test:e2e` (if `apps/web` exists)
5. `pnpm size` (if configured)
6. `git status`: report uncommitted files.

Summarize: pass/fail per step, test counts, and the budget numbers. Never claim success without having run the commands in this session.

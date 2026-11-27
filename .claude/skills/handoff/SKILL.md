---
name: handoff
description: "Use before a session ends or when the context is getting long: write a short progress note so the next session can continue without chat history."
---
Create `docs/progress/<YYYY-MM-DD>-<short-topic>.md` (≤ 40 lines):

- **Done this session:** tasks or steps completed, with commit hashes.
- **State:** the plan and next unchecked task, whether `pnpm verify` is green, and anything uncommitted.
- **Decisions:** with links to any new ADRs.
- **Open questions for the owner.**
- **Gotchas:** anything surprising the next session must know (commands, flaky tests, environment).

Don't include secrets, `.env` values or personal data. Commit it: `docs: progress note <date>`.

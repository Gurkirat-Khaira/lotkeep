---
name: plan-next
description: "Use to pick up the next unchecked task in the active plan and carry it out end to end (TDD, reviews, commit), and again after each finished task to continue."
argument-hint: "[optional task number]"
---
1. Find the active plan: the newest `docs/superpowers/plans/*.md` with unchecked `- [ ]` steps. If $ARGUMENTS names a task number, use that task instead.
2. Read the whole task (Files, Interfaces, Steps), the plan's Global Constraints, Definition of Done and Testing setup, and the `CLAUDE.md` of every package the task touches.
3. Summarize the task for the owner in 3 lines and list any open question. If a question blocks the work, ask it and stop.
4. Execute it with superpowers:subagent-driven-development (or superpowers:test-driven-development inline):
   - write the exact failing tests (the `test-writer` agent can do this) → run them and confirm they fail for the right reason;
   - write minimal code → run until green → `pnpm verify`.
5. Run the `security-reviewer` agent if the task touches tenancy, auth, crypto, licensing or PII. Run `compliance-reviewer` for rule values and `ui-reviewer` for web changes. Fix BLOCKERs.
6. Tick the task's checkboxes in the plan file, then commit with the plan's exact commit message.
7. Explain in 3–5 plain sentences what was built and why, then **continue with the next task** (run `/plan-next` again) unless the owner has said stop.
   - Always pause and ask first before anything on the "Stop and ask the owner" list in `CLAUDE.md` and the plan: creating or pushing the GitHub repo, a dependency outside the approved list, a rule value that conflicts with the research, or anything needing real accounts, money or keys.
   - If the context is getting long, run `/handoff` first.

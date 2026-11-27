# Starter prompt for Claude Code

The `DMS Software` folder is the **seed of the repository**. It already contains the Claude Code workspace:
- `CLAUDE.md` plus package `CLAUDE.md` files;
- `.claude/` with settings, hooks, agents and skills (you already renamed it from `claude-workspace/`; dot-folders can be hidden in Windows Explorer and some sync tools, so check with `ls -a`);
- `brand/` (placeholder name **Lotkeep** and logo);
- `docs/` (spec v5.2, Plan 1 v5, research).

## Part A — one-time setup (the owner does this)

1. **WSL2 + Ubuntu.** In PowerShell as admin: `wsl --install -d Ubuntu`, restart, then create your Linux user.
2. **Docker Desktop** for Windows → Settings → Resources → WSL integration → enable Ubuntu.
3. **GitHub:** turn on two-factor authentication for your account.
4. In Ubuntu:
   ```bash
   sudo apt update && sudo apt install -y git build-essential curl gh
   gh auth login
   # gitleaks: use the GitHub release (needs ≥ 8.19; Ubuntu's apt package is older)
   cd /tmp && gh release download -R gitleaks/gitleaks -p '*linux_x64.tar.gz' \
     && tar xzf gitleaks_*_linux_x64.tar.gz gitleaks && sudo install gitleaks /usr/local/bin/ && cd -
   gitleaks version
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && source ~/.bashrc
   nvm install 22 && corepack enable
   npm install -g @anthropic-ai/claude-code
   git config --global user.name "Gurkirat Singh Khaira"
   git config --global user.email "<your GitHub noreply email>"

   mkdir -p ~/code && cp -r "/mnt/c/Users/gurki/Desktop/DMS Software" ~/code/lotkeep
   cd ~/code/lotkeep
   find . -type f \( -name '*.mjs' -o -name '*.sh' -o -name '*.json' -o -name '*.md' \) -exec sed -i 's/\r$//' {} +   # strip any Windows line endings
   [ -d claude-workspace ] && mv claude-workspace .claude   # only if not renamed yet
   [ -d claude-workspace-update ] && cp -r claude-workspace-update/. .claude/ && rm -rf claude-workspace-update   # apply the updates
   rm -rf .claude/commands   # replaced by .claude/skills
   ls .claude    # should list: agents hooks settings.json skills
   git init -b main && claude
   ```
   **Why the rename:** for safety, Claude in Cowork isn't allowed to write directly into a `.claude` folder on your computer, because hooks there run code. So the Claude Code settings, hooks, agents and commands were saved as `claude-workspace/`. Read them if you like (they are short, plain files), then rename the folder to `.claude` yourself with the command above.
   The folder name `lotkeep` is only the working name. Renaming it later is fine.
5. In Claude Code, install the superpowers plugin, then restart Claude Code:
   ```
   /plugin marketplace add obra/superpowers-marketplace
   /plugin install superpowers@superpowers-marketplace
   ```
6. On first start, Claude Code asks whether to trust the folder and its hooks. Say **yes**: the hooks in `.claude/hooks/` are plain Node scripts you can read. Then paste Part B.

---

## Part B — paste this into Claude Code

You are the lead engineer on a new open-source project: a **Dealer Management System (DMS) for small independent used car dealers**, California first. The owner is Gurkirat (Kirat) Singh Khaira (GitHub `Gurkirat-Khaira`), a CS student and the person responsible for security. Phase 1 is a **web app** developed locally with **synthetic data only**; it will not be used for real deals yet.

This folder is already set up for you. `CLAUDE.md` (root and per package), `.claude/` (settings, hooks, agents `security-reviewer`, `compliance-reviewer`, `test-writer`, `ui-reviewer`, and skills `/plan-next`, `/new-tenant-table`, `/new-api-route`, `/new-rule`, `/handoff`, `/verify`), `brand/` and `docs/` already exist. **Do not overwrite or restructure them.** Build the code around them. If one of them seems wrong, tell me instead of changing it.

Read these, in order:
1. `CLAUDE.md`
2. `docs/superpowers/specs/2026-11-25-open-source-dms-design.md` (v5.2): the source of truth
3. `docs/superpowers/plans/2026-11-25-plan-1-foundation.md` (v5): what you build now (15 tasks). Its **Approved dependencies** list is the only set of packages you may add without asking.
4. Skim `docs/research/` and consult it when a task needs it. `California CARS Act SB 766.md` has rule IDs CA-CARS-01…18 for later plans.

Key facts:
- A dealer (legal entity) is the tenant and can run multiple locations.
- The web app stays wrap-ready for Tauri desktop and Android apps in Phase 2.
- Open core: the root is AGPL-3.0. Paid features live in `packages/ee/` under a commercial license from the first commit and unlock only with an Ed25519-signed license key.
- At launch there is a free ~6-month promotion key that unlocks everything.
- Draft pricing lives only in `packages/entitlements/plans.yaml`.
- A CLA is required for outside contributions.
- The product name is a placeholder: never hard-code it; use `@dms/brand`.

Your job in this session:
- Check the prerequisites: `docker version`, `node -v` (22.x), `pnpm -v`, `git --version`, `gh auth status`, `gitleaks version` (must be ≥ 8.19). Tell me what's missing.
- Execute Plan 1 task by task with `/plan-next` (superpowers:subagent-driven-development + TDD).
- Follow the plan's **Definition of Done** for every task: one commit per task with the plan's message, and checkboxes ticked.
- After each task, explain in 3–5 plain sentences what you built and why, then continue with the next task unless I say stop.
- Before you run out of context or end the session, run `/handoff`.
- Don't start Plans 2–9. When Plan 1 is done, write `docs/progress/plan-1-report.md` and tell me how to start the app (`pnpm dev:up --full`, then `http://localhost:5173`, seed login from `pnpm db:seed`).

GitHub: work **locally only** until I approve. After Task 1 is committed and `pnpm verify` is green locally, ask me before creating the repo; don't push before that. Then:
```
gh repo create Gurkirat-Khaira/lotkeep --public --source . --push
```
Then turn on branch protection for `main` (require PR + passing CI), Dependabot alerts, secret scanning with push protection, and private vulnerability reporting.

Begin by reading the files, checking the prerequisites, and summarizing Task 1 for me.

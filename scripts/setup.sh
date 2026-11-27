#!/usr/bin/env bash
# First-time setup: checks the required tools, installs the git hooks and dependencies.
# Safe to re-run. (Plan 1 Task 2 adds local secret generation here.)
set -euo pipefail

cd "$(dirname "$0")/.."

ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad() { printf '  \033[31m✗\033[0m %s\n' "$1"; FAILED=1; }
FAILED=0

# version_ge A B → true if version A >= B (numeric dot comparison).
version_ge() { [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]; }

echo "Checking tools…"

if command -v node >/dev/null 2>&1; then
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$node_major" = "22" ]; then ok "node $(node -v)"; else bad "node 22 required (found $(node -v)). Try: nvm install 22"; fi
else
  bad "node 22 is missing. Install it with nvm: nvm install 22"
fi

if command -v pnpm >/dev/null 2>&1; then ok "pnpm $(pnpm -v)"; else bad "pnpm is missing. Run: corepack enable"; fi

if command -v docker >/dev/null 2>&1 && docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
  ok "docker $(docker version --format '{{.Server.Version}}')"
else
  bad "docker is missing or not running. Start Docker Desktop (WSL2 integration on Windows)."
fi

if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then ok "gh (logged in)"; else ok "gh (not logged in: run 'gh auth login' when you need GitHub)"; fi
else
  bad "gh is missing. See https://cli.github.com/"
fi

if command -v gitleaks >/dev/null 2>&1; then
  gl_version="$(gitleaks version 2>/dev/null | tr -d 'v' | head -n1)"
  if version_ge "$gl_version" "8.19.0"; then
    ok "gitleaks $gl_version"
  else
    bad "gitleaks >= 8.19 required (found $gl_version). Install the release binary from https://github.com/gitleaks/gitleaks/releases (apt's package is too old)."
  fi
else
  bad "gitleaks >= 8.19 is missing. Install the release binary from https://github.com/gitleaks/gitleaks/releases"
fi

if [ "$FAILED" -ne 0 ]; then
  echo "Fix the items above, then re-run scripts/setup.sh." >&2
  exit 1
fi

echo "Installing git hooks…"
git config core.hooksPath scripts/git-hooks
chmod +x scripts/git-hooks/*
ok "core.hooksPath = scripts/git-hooks"

echo "Installing dependencies…"
pnpm install --frozen-lockfile
ok "dependencies installed"

echo "Done. Next: pnpm verify"

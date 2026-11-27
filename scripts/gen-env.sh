#!/usr/bin/env bash
# Creates the local .env from .env.example with fresh random secrets.
# Never overwrites an existing .env and never prints secret values.
# Used by scripts/setup.sh and by CI.
set -euo pipefail

cd "$(dirname "$0")/.."
target=".env"
template=".env.example"

if [ -e "$target" ]; then
  echo "  .env already exists: left unchanged"
  exit 0
fi

command -v openssl >/dev/null 2>&1 || { echo "openssl is required to generate secrets" >&2; exit 1; }

# Hex passwords are URL-safe, so they can go straight into the DATABASE_URL_* values.
hex() { openssl rand -hex 24; }

declare -A value=(
  [POSTGRES_PASSWORD]="$(hex)"
  [DMS_OWNER_PASSWORD]="$(hex)"
  [DMS_APP_PASSWORD]="$(hex)"
  [MINIO_ROOT_PASSWORD]="$(hex)"
  [S3_SECRET_KEY]="$(hex)"
  [MASTER_KEY]="$(openssl rand -base64 32)"
)

umask 077 # the file is readable by the current user only
tmp="$(mktemp "${target}.XXXXXX")"
trap 'rm -f "$tmp"' EXIT

while IFS= read -r line || [ -n "$line" ]; do
  key="${line%%=*}"
  if [[ "$line" =~ ^[A-Z0-9_]+=$ ]] && [ -n "${value[$key]+set}" ]; then
    line="${key}=${value[$key]}"
  fi
  for name in "${!value[@]}"; do
    line="${line//__${name}__/${value[$name]}}"
  done
  printf '%s\n' "$line"
done <"$template" >"$tmp"

if grep -v '^#' "$tmp" | grep -qE '^(POSTGRES_PASSWORD|DMS_OWNER_PASSWORD|DMS_APP_PASSWORD|MINIO_ROOT_PASSWORD|S3_SECRET_KEY|MASTER_KEY)=$|__[A-Z_]+__'; then
  echo "gen-env: a secret was left empty; check .env.example" >&2
  exit 1
fi

mv -n "$tmp" "$target"
if [ -e "$tmp" ]; then # another process created .env first; keep theirs
  echo "  .env appeared while generating: left unchanged"
  exit 0
fi
trap - EXIT
echo "  created .env with fresh random secrets (mode 600)"

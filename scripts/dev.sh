#!/usr/bin/env bash
# Local Docker environment: scripts/dev.sh up | down | reset
#   up     start Postgres + MinIO, wait until healthy, then run the one-shot MinIO init
#          (`--full` adds api, web and worker from Plan 1 Task 14)
#   down   stop the containers (data is kept)
#   reset  stop and DELETE the local data volumes, after a typed confirmation
set -euo pipefail

cd "$(dirname "$0")/.."
env_file="$PWD/.env"
if [ ! -f "$env_file" ]; then
  echo "No local .env yet. Run scripts/setup.sh first." >&2
  exit 1
fi
compose() { docker compose --env-file "$env_file" -f docker/compose.dev.yml "$@"; }

cmd="${1:-}"
shift || true
case "$cmd" in
  up)
    if [ "${1:-}" = "--full" ]; then
      echo "--full (api, web, worker containers) is added in Plan 1 Task 14." >&2
      exit 1
    fi
    compose up -d --wait postgres minio
    compose --profile init run --rm minio-init
    echo "Postgres on 127.0.0.1:5432, MinIO on 127.0.0.1:9000 (console :9001)."
    ;;
  down)
    compose --profile init down
    ;;
  reset)
    echo "This DELETES the local Postgres and MinIO data volumes (synthetic dev data only)."
    read -r -p "Type 'reset' to continue: " answer
    if [ "$answer" != "reset" ]; then
      echo "Cancelled."
      exit 1
    fi
    compose --profile init down --volumes
    echo "Volumes removed. Run 'pnpm dev:up' to start fresh."
    ;;
  *)
    echo "usage: scripts/dev.sh up [--full] | down | reset" >&2
    exit 2
    ;;
esac

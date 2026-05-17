#!/usr/bin/env bash
# staging-up.sh: 本番 katorin2 DB の snapshot を staging DB に反映し、 staging アプリを起動する
# 想定実行: codenica-vps (ubuntu user、 docker group 所属)
# 使い方:
#   ローカル Mac から: ssh codenica-vps 'bash -s' < scripts/staging-up.sh
#   VPS 上で直接実行 : bash scripts/staging-up.sh
set -euo pipefail

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-postgres}"
PROD_DB="${PROD_DB:-katorin2}"
STAGING_DB="${STAGING_DB:-katorin2_staging}"
STAGING_DB_USER="${STAGING_DB_USER:-katorin2_staging_app}"
STAGING_COMPOSE_DIR="${STAGING_COMPOSE_DIR:-/opt/katorin2-staging}"
DUMP_FILE="${DUMP_FILE:-/tmp/${PROD_DB}_$(date +%Y%m%d_%H%M%S).dump}"

log() { printf '[staging-up] %s\n' "$*"; }

if ! docker ps --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
  echo "[staging-up] postgres container '$POSTGRES_CONTAINER' is not running" >&2
  exit 1
fi

if [[ ! -d "$STAGING_COMPOSE_DIR" ]]; then
  echo "[staging-up] staging compose dir '$STAGING_COMPOSE_DIR' not found" >&2
  exit 1
fi

log "stopping staging app container (if running)..."
( cd "$STAGING_COMPOSE_DIR" && docker compose down ) || true

log "terminating remaining sessions on $STAGING_DB..."
docker exec "$POSTGRES_CONTAINER" psql -U postgres -d postgres -tAc \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${STAGING_DB}' AND pid <> pg_backend_pid();" \
  >/dev/null

log "dumping ${PROD_DB} -> ${DUMP_FILE} (inside container)..."
docker exec "$POSTGRES_CONTAINER" bash -c \
  "pg_dump -U postgres --format=custom --no-owner --no-privileges '${PROD_DB}' > '${DUMP_FILE}'"

log "dropping ${STAGING_DB}..."
docker exec "$POSTGRES_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"${STAGING_DB}\";"

log "creating ${STAGING_DB} (owner=${STAGING_DB_USER})..."
docker exec "$POSTGRES_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE \"${STAGING_DB}\" OWNER \"${STAGING_DB_USER}\";"

log "restoring ${DUMP_FILE} into ${STAGING_DB} as role ${STAGING_DB_USER}..."
docker exec "$POSTGRES_CONTAINER" pg_restore -U postgres --no-owner --no-acl \
  --role="${STAGING_DB_USER}" -d "${STAGING_DB}" "${DUMP_FILE}"

log "cleaning up dump..."
docker exec "$POSTGRES_CONTAINER" rm -f "${DUMP_FILE}"

log "starting staging app..."
( cd "$STAGING_COMPOSE_DIR" && ./up.sh )

log "done. staging at http://127.0.0.1:8002 (https://katorin2-staging.codenica.dev via Caddy)."

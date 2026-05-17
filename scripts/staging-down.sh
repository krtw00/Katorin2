#!/usr/bin/env bash
# staging-down.sh: staging app コンテナを停止する (DB はそのまま残す)
# 想定実行: codenica-vps (ubuntu user、 docker group 所属)
# 使い方:
#   ローカル Mac から: ssh codenica-vps 'bash -s' < scripts/staging-down.sh
#   VPS 上で直接実行 : bash scripts/staging-down.sh
set -euo pipefail

STAGING_COMPOSE_DIR="${STAGING_COMPOSE_DIR:-/opt/katorin2-staging}"

log() { printf '[staging-down] %s\n' "$*"; }

if [[ ! -d "$STAGING_COMPOSE_DIR" ]]; then
  echo "[staging-down] staging compose dir '$STAGING_COMPOSE_DIR' not found" >&2
  exit 1
fi

log "stopping staging app container..."
( cd "$STAGING_COMPOSE_DIR" && docker compose down && rm -f .env )

log "done. katorin2_staging DB is left intact; next staging-up will overwrite it."

#!/usr/bin/env bash
set -euo pipefail

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud is required" >&2
  exit 1
fi

APP_ENV="${APP_ENV:-production}"
APP_NAME="${APP_NAME:-katorin2}"
DEFAULT_SECRET_NAME="${APP_NAME}-ledger-runtime-${APP_ENV}"

: "${GOOGLE_CLOUD_PROJECT:?GOOGLE_CLOUD_PROJECT is required}"
: "${RUNTIME_ENV_FILE:?RUNTIME_ENV_FILE is required}"
: "${RUNTIME_ENV_SECRET:=$DEFAULT_SECRET_NAME}"

if [[ ! -f "$RUNTIME_ENV_FILE" ]]; then
  echo "Runtime env file not found: $RUNTIME_ENV_FILE" >&2
  exit 1
fi

if ! gcloud secrets describe "$RUNTIME_ENV_SECRET" --project "$GOOGLE_CLOUD_PROJECT" >/dev/null 2>&1; then
  gcloud secrets create "$RUNTIME_ENV_SECRET" \
    --project "$GOOGLE_CLOUD_PROJECT" \
    --replication-policy automatic
fi

gcloud secrets versions add "$RUNTIME_ENV_SECRET" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --data-file "$RUNTIME_ENV_FILE"

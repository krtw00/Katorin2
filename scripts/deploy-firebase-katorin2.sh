#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-${GCP_PROJECT_ID:-}}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID is required." >&2
  exit 1
fi

npx firebase-tools deploy \
  --project "$PROJECT_ID" \
  --config deploy/firebase/katorin2.hosting.json \
  --only hosting

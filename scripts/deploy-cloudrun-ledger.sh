#!/usr/bin/env bash
set -euo pipefail

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud is required" >&2
  exit 1
fi

APP_ENV="${APP_ENV:-production}"
APP_NAME="${APP_NAME:-katorin2}"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"

if [[ "${ALLOW_BRANCH_MISMATCH:-0}" != "1" ]]; then
  case "$APP_ENV" in
    production)
      [[ "$CURRENT_BRANCH" == "main" ]] || {
        echo "production deploys must run from main (current: ${CURRENT_BRANCH:-unknown})" >&2
        exit 1
      }
      ;;
    staging)
      [[ "$CURRENT_BRANCH" == "staging" ]] || {
        echo "staging deploys must run from staging (current: ${CURRENT_BRANCH:-unknown})" >&2
        exit 1
      }
      ;;
  esac
fi

case "$APP_ENV" in
  production)
    DEFAULT_CLOUD_RUN_SERVICE="$APP_NAME"
    ;;
  staging)
    DEFAULT_CLOUD_RUN_SERVICE="${APP_NAME}-staging"
    ;;
  *)
    DEFAULT_CLOUD_RUN_SERVICE="${APP_NAME}-${APP_ENV}"
    ;;
esac

: "${GOOGLE_CLOUD_PROJECT:?GOOGLE_CLOUD_PROJECT is required}"
: "${GOOGLE_CLOUD_REGION:=asia-northeast1}"
: "${CLOUD_RUN_SERVICE:=$DEFAULT_CLOUD_RUN_SERVICE}"
: "${ARTIFACT_REGISTRY_REPOSITORY:=apps}"

DEFAULT_RUNTIME_SECRET="${APP_NAME}-ledger-runtime-${APP_ENV}"
: "${RUNTIME_ENV_SECRET:=$DEFAULT_RUNTIME_SECRET}"

cleanup() {
  if [[ -n "${TEMP_RUNTIME_ENV_FILE:-}" && -f "${TEMP_RUNTIME_ENV_FILE}" ]]; then
    rm -f "${TEMP_RUNTIME_ENV_FILE}"
  fi
}

trap cleanup EXIT

if [[ -n "${RUNTIME_ENV_FILE:-}" ]]; then
  if [[ ! -f "$RUNTIME_ENV_FILE" ]]; then
    echo "Runtime env file not found: $RUNTIME_ENV_FILE" >&2
    exit 1
  fi
elif [[ -n "${RUNTIME_ENV_SECRET:-}" ]]; then
  TEMP_RUNTIME_ENV_FILE="$(mktemp)"
  gcloud secrets versions access latest \
    --project "$GOOGLE_CLOUD_PROJECT" \
    --secret "$RUNTIME_ENV_SECRET" > "$TEMP_RUNTIME_ENV_FILE"
  RUNTIME_ENV_FILE="$TEMP_RUNTIME_ENV_FILE"
else
  echo "Either RUNTIME_ENV_FILE or RUNTIME_ENV_SECRET is required" >&2
  exit 1
fi

for key in LEDGER_DATABASE_URL RAILS_MASTER_KEY SECRET_KEY_BASE; do
  if ! grep -q "^${key}:" "$RUNTIME_ENV_FILE"; then
    echo "${key} is required in ${RUNTIME_ENV_FILE}" >&2
    exit 1
  fi
done

IMAGE="${GOOGLE_CLOUD_REGION}-docker.pkg.dev/${GOOGLE_CLOUD_PROJECT}/${ARTIFACT_REGISTRY_REPOSITORY}/${CLOUD_RUN_SERVICE}:${APP_ENV}-ledger-$(git rev-parse --short HEAD)"

gcloud builds submit \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --config deploy/google/cloudbuild.ledger.yaml \
  --substitutions=_IMAGE="$IMAGE"

gcloud run deploy "$CLOUD_RUN_SERVICE" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --region "$GOOGLE_CLOUD_REGION" \
  --image "$IMAGE" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --env-vars-file "$RUNTIME_ENV_FILE"

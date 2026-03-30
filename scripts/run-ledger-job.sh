#!/usr/bin/env bash
set -euo pipefail

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud is required" >&2
  exit 1
fi

APP_ENV="${APP_ENV:-production}"
APP_NAME="${APP_NAME:-katorin2}"
TASK_NAME="${TASK_NAME:-seed}"
JOB_COMMAND="${JOB_COMMAND:-./bin/rails db:seed}"

case "$APP_ENV" in
  production)
    DEFAULT_CLOUD_RUN_SERVICE="$APP_NAME"
    DEFAULT_CLOUD_RUN_JOB="${APP_NAME}-${TASK_NAME}"
    ;;
  staging)
    DEFAULT_CLOUD_RUN_SERVICE="${APP_NAME}-staging"
    DEFAULT_CLOUD_RUN_JOB="${APP_NAME}-staging-${TASK_NAME}"
    ;;
  *)
    DEFAULT_CLOUD_RUN_SERVICE="${APP_NAME}-${APP_ENV}"
    DEFAULT_CLOUD_RUN_JOB="${APP_NAME}-${APP_ENV}-${TASK_NAME}"
    ;;
esac

: "${GOOGLE_CLOUD_PROJECT:?GOOGLE_CLOUD_PROJECT is required}"
: "${GOOGLE_CLOUD_REGION:=asia-northeast1}"
: "${CLOUD_RUN_SERVICE:=$DEFAULT_CLOUD_RUN_SERVICE}"
: "${CLOUD_RUN_JOB:=$DEFAULT_CLOUD_RUN_JOB}"
: "${TASK_TIMEOUT:=10m}"
: "${CLOUD_SQL_INSTANCE:=${GOOGLE_CLOUD_PROJECT}:${GOOGLE_CLOUD_REGION}:main-pg}"

APP_RUNTIME_SECRET_DEFAULT="${APP_NAME}-ledger-runtime-${APP_ENV}"
: "${RUNTIME_ENV_SECRET:=$APP_RUNTIME_SECRET_DEFAULT}"

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

IMAGE="${IMAGE:-$(gcloud run services describe "$CLOUD_RUN_SERVICE" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --region "$GOOGLE_CLOUD_REGION" \
  --format='value(spec.template.spec.containers[0].image)')}"

if [[ -z "$IMAGE" ]]; then
  echo "Failed to resolve image from Cloud Run service: $CLOUD_RUN_SERVICE" >&2
  exit 1
fi

gcloud run jobs deploy "$CLOUD_RUN_JOB" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --region "$GOOGLE_CLOUD_REGION" \
  --image "$IMAGE" \
  --env-vars-file "$RUNTIME_ENV_FILE" \
  --add-cloudsql-instances "$CLOUD_SQL_INSTANCE" \
  --command bash \
  --args=-lc,"$JOB_COMMAND" \
  --max-retries=0 \
  --task-timeout "$TASK_TIMEOUT" \
  --wait

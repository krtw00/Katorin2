#!/usr/bin/env bash
set -euo pipefail

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud is required" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required" >&2
  exit 1
fi

GCLOUD_SDK_ROOT="${GCLOUD_SDK_ROOT:-$(gcloud info --format='value(installation.sdk_root)')}"
CLOUD_SQL_PROXY_BIN="${CLOUD_SQL_PROXY_BIN:-${GCLOUD_SDK_ROOT}/bin/cloud-sql-proxy}"

if [[ ! -x "$CLOUD_SQL_PROXY_BIN" ]]; then
  echo "cloud-sql-proxy not found at: $CLOUD_SQL_PROXY_BIN" >&2
  exit 1
fi

: "${GOOGLE_CLOUD_PROJECT:?GOOGLE_CLOUD_PROJECT is required}"
: "${SERVICE_DB_USER:?SERVICE_DB_USER is required}"

GOOGLE_CLOUD_REGION="${GOOGLE_CLOUD_REGION:-asia-northeast1}"
CLOUD_SQL_INSTANCE="${CLOUD_SQL_INSTANCE:-main-pg}"
CLOUD_SQL_CONNECTION_NAME="${CLOUD_SQL_CONNECTION_NAME:-${GOOGLE_CLOUD_PROJECT}:${GOOGLE_CLOUD_REGION}:${CLOUD_SQL_INSTANCE}}"
OWNER_ROLE="${OWNER_ROLE:-app-user}"
ADMIN_PASSWORD_SECRET="${ADMIN_PASSWORD_SECRET:-main-pg-postgres-admin-password}"
PROXY_PORT="${PROXY_PORT:-9470}"
DB_HOST_SOCKET="${DB_HOST_SOCKET:-/cloudsql/${CLOUD_SQL_CONNECTION_NAME}}"
SECRET_PAYLOAD_KIND="${SECRET_PAYLOAD_KIND:-password}"

if [[ -n "${SERVICE_DB_PASSWORD:-}" ]]; then
  DB_PASSWORD="$SERVICE_DB_PASSWORD"
else
  DB_PASSWORD="$(openssl rand -hex 24)"
fi

cleanup() {
  if [[ -n "${PROXY_PID:-}" ]]; then
    kill "$PROXY_PID" >/dev/null 2>&1 || true
    wait "$PROXY_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

ADMIN_PASSWORD="$(gcloud secrets versions access latest \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --secret "$ADMIN_PASSWORD_SECRET")"

"$CLOUD_SQL_PROXY_BIN" "$CLOUD_SQL_CONNECTION_NAME" --port "$PROXY_PORT" >/tmp/cloud-sql-proxy.log 2>&1 &
PROXY_PID=$!

for _ in $(seq 1 20); do
  if PGPASSWORD="$ADMIN_PASSWORD" psql \
    "host=127.0.0.1 port=${PROXY_PORT} dbname=postgres user=postgres sslmode=disable connect_timeout=2" \
    -c "select 1" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! PGPASSWORD="$ADMIN_PASSWORD" psql \
  "host=127.0.0.1 port=${PROXY_PORT} dbname=postgres user=postgres sslmode=disable connect_timeout=2" \
  -c "select 1" >/dev/null 2>&1; then
  echo "failed to connect to Cloud SQL via proxy" >&2
  cat /tmp/cloud-sql-proxy.log >&2 || true
  exit 1
fi

if gcloud sql users list \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --instance="$CLOUD_SQL_INSTANCE" \
  --format='value(name)' | grep -Fxq "$SERVICE_DB_USER"; then
  gcloud sql users set-password "$SERVICE_DB_USER" \
    --project "$GOOGLE_CLOUD_PROJECT" \
    --instance="$CLOUD_SQL_INSTANCE" \
    --password="$DB_PASSWORD" >/dev/null
else
  gcloud sql users create "$SERVICE_DB_USER" \
    --project "$GOOGLE_CLOUD_PROJECT" \
    --instance="$CLOUD_SQL_INSTANCE" \
    --password="$DB_PASSWORD" >/dev/null
fi

PGPASSWORD="$ADMIN_PASSWORD" psql \
  "host=127.0.0.1 port=${PROXY_PORT} dbname=postgres user=postgres sslmode=disable" \
  -v ON_ERROR_STOP=1 \
  -c "GRANT \"$OWNER_ROLE\" TO \"$SERVICE_DB_USER\";" >/dev/null

if [[ -n "${SECRET_NAME:-}" ]]; then
  if ! gcloud secrets describe "$SECRET_NAME" \
    --project "$GOOGLE_CLOUD_PROJECT" >/dev/null 2>&1; then
    gcloud secrets create "$SECRET_NAME" \
      --project "$GOOGLE_CLOUD_PROJECT" \
      --replication-policy=automatic >/dev/null
  fi

  case "$SECRET_PAYLOAD_KIND" in
    password)
      SECRET_PAYLOAD="$DB_PASSWORD"
      ;;
    database_url)
      : "${DB_NAME:?DB_NAME is required when SECRET_PAYLOAD_KIND=database_url}"
      SECRET_PAYLOAD="postgresql://${SERVICE_DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=${DB_HOST_SOCKET}"
      ;;
    *)
      echo "SECRET_PAYLOAD_KIND must be one of: password, database_url" >&2
      exit 1
      ;;
  esac

  printf '%s' "$SECRET_PAYLOAD" | gcloud secrets versions add "$SECRET_NAME" \
    --project "$GOOGLE_CLOUD_PROJECT" \
    --data-file=- >/dev/null
fi

cat <<EOF
provisioned service db user
service_db_user: $SERVICE_DB_USER
owner_role: $OWNER_ROLE
cloud_sql_instance: $CLOUD_SQL_INSTANCE
password_secret: ${SECRET_NAME:-<not-updated>}
secret_payload_kind: ${SECRET_PAYLOAD_KIND}

next steps:
  1. update the Cloud Run service or job to use $SERVICE_DB_USER
  2. verify the new revision can connect to Cloud SQL
  3. confirm no service still references a shared login
EOF

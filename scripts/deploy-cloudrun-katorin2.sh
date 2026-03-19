#!/usr/bin/env bash
set -euo pipefail

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud is required"
  exit 1
fi

: "${GOOGLE_CLOUD_PROJECT:?GOOGLE_CLOUD_PROJECT is required}"
: "${GOOGLE_CLOUD_REGION:?GOOGLE_CLOUD_REGION is required}"
: "${CLOUD_RUN_SERVICE:=katorin2}"
: "${ARTIFACT_REGISTRY_REPOSITORY:=apps}"
: "${RUNTIME_ENV_FILE:=deploy/google/katorin2.runtime.env}"

if [[ ! -f "$RUNTIME_ENV_FILE" ]]; then
  echo "Runtime env file not found: $RUNTIME_ENV_FILE"
  echo "Copy deploy/google/katorin2.runtime.env.example and fill in values."
  exit 1
fi

IMAGE="${GOOGLE_CLOUD_REGION}-docker.pkg.dev/${GOOGLE_CLOUD_PROJECT}/${ARTIFACT_REGISTRY_REPOSITORY}/${CLOUD_RUN_SERVICE}:$(git rev-parse --short HEAD)"

NEXT_PUBLIC_SUPABASE_URL="$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$RUNTIME_ENV_FILE" | cut -d '=' -f2-)"
NEXT_PUBLIC_SUPABASE_ANON_KEY="$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$RUNTIME_ENV_FILE" | cut -d '=' -f2-)"
NEXT_PUBLIC_R2_PUBLIC_URL="$(grep '^NEXT_PUBLIC_R2_PUBLIC_URL=' "$RUNTIME_ENV_FILE" | cut -d '=' -f2-)"

if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" || -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]]; then
  echo "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required in $RUNTIME_ENV_FILE"
  exit 1
fi

gcloud builds submit \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --config deploy/google/cloudbuild.katorin2.yaml \
  --substitutions=_IMAGE="$IMAGE",_NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL",_NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY",_NEXT_PUBLIC_R2_PUBLIC_URL="$NEXT_PUBLIC_R2_PUBLIC_URL"

gcloud run deploy "$CLOUD_RUN_SERVICE" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --region "$GOOGLE_CLOUD_REGION" \
  --image "$IMAGE" \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --env-vars-file "$RUNTIME_ENV_FILE"

#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="${PROJECT_REF:-acrvyexkvtpmyprojdzw}"
SUPABASE_URL="${SUPABASE_URL:-https://${PROJECT_REF}.supabase.co}"

require() {
  if [[ -z "${!1:-}" ]]; then
    echo "Missing required env var: $1" >&2
    exit 1
  fi
}

require SUPABASE_ACCESS_TOKEN

cmd="${1:-}"; shift || true

set_secrets() {
  require STRIPE_SECRET_KEY
  require STRIPE_WEBHOOK_SECRET
  require SQUARE_ACCESS_TOKEN
  require SQUARE_WEBHOOK_SIGNATURE_KEY
  require AUTHORIZENET_API_LOGIN_ID
  require AUTHORIZENET_TRANSACTION_KEY
  require AUTHORIZENET_WEBHOOK_SIGNATURE_KEY

  AUTHORIZENET_API_URL="${AUTHORIZENET_API_URL:-https://apitest.authorize.net/xml/v1/request.api}"

  npx -y supabase secrets set --project-ref "$PROJECT_REF" \
    STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
    STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
    SQUARE_ACCESS_TOKEN="$SQUARE_ACCESS_TOKEN" \
    SQUARE_WEBHOOK_SIGNATURE_KEY="$SQUARE_WEBHOOK_SIGNATURE_KEY" \
    AUTHORIZENET_API_LOGIN_ID="$AUTHORIZENET_API_LOGIN_ID" \
    AUTHORIZENET_TRANSACTION_KEY="$AUTHORIZENET_TRANSACTION_KEY" \
    AUTHORIZENET_WEBHOOK_SIGNATURE_KEY="$AUTHORIZENET_WEBHOOK_SIGNATURE_KEY" \
    AUTHORIZENET_API_URL="$AUTHORIZENET_API_URL"
}

verify_functions() {
  npx -y supabase functions list --project-ref "$PROJECT_REF"
}

sync_provider() {
  provider="$1"
  require ACCESS_TOKEN
  require ANON_KEY
  require COMPANY_ID

  curl -sS -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    "${SUPABASE_URL}/functions/v1/ingestion-api/v1/connectors/${provider}/sync" \
    -d "{\"company_id\":\"${COMPANY_ID}\",\"idempotency_key\":\"manual-sync:${provider}:$(date +%s)\",\"max_retries\":3}" | jq .
}

backfill_provider() {
  provider="$1"
  require ACCESS_TOKEN
  require ANON_KEY
  require COMPANY_ID

  since="${SINCE:-$(date -u -v-7d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || python3 - <<'PY'
from datetime import datetime, timedelta
print((datetime.utcnow()-timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ'))
PY
)}"
  until="${UNTIL:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"

  curl -sS -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    "${SUPABASE_URL}/functions/v1/ingestion-api/v1/connectors/${provider}/backfill" \
    -d "{\"company_id\":\"${COMPANY_ID}\",\"idempotency_key\":\"backfill:${provider}:$(date +%s)\",\"max_retries\":3,\"since\":\"${since}\",\"until\":\"${until}\",\"pages\":3}" | jq .
}

case "$cmd" in
  set-secrets)
    set_secrets
    ;;
  verify-functions)
    verify_functions
    ;;
  sync)
    sync_provider "$1"
    ;;
  backfill)
    backfill_provider "$1"
    ;;
  *)
    cat <<USAGE
Usage:
  SUPABASE_ACCESS_TOKEN=... scripts/phase_a_activate.sh set-secrets
  SUPABASE_ACCESS_TOKEN=... scripts/phase_a_activate.sh verify-functions
  SUPABASE_ACCESS_TOKEN=... ACCESS_TOKEN=... ANON_KEY=... COMPANY_ID=... scripts/phase_a_activate.sh sync stripe|square|authorizenet
  SUPABASE_ACCESS_TOKEN=... ACCESS_TOKEN=... ANON_KEY=... COMPANY_ID=... scripts/phase_a_activate.sh backfill stripe|square|authorizenet
USAGE
    exit 1
    ;;
esac

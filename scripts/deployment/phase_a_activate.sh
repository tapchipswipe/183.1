#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load local env file if present (but never commit real secrets)
if [[ -f "${REPO_ROOT}/.env" ]]; then
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/.env"
fi

# ---------- Helpers ----------

log() {
  # Log to stderr with UTC timestamp
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >&2
}

fail() {
  log "ERROR: $*"
  exit 1
}

require() {
  local name="$1"
  if [[ -z "${!name-}" ]]; then
    fail "Missing required environment variable: ${name}"
  fi
}

# Portable "7 days ago" in UTC
seven_days_ago_utc() {
  if date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ >/dev/null 2>&1; then
    date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ
  elif date -u -v-7d +%Y-%m-%dT%H:%M:%SZ >/dev/null 2>&1; then
    # macOS BSD date
    date -u -v-7d +%Y-%m-%dT%H:%M:%SZ
  else
    python3 - << 'PY'
from datetime import datetime, timedelta
print((datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ"))
PY
  fi
}

# Thin wrapper around Supabase CLI so we always pass project + token
supa() {
  if ! command -v supabase >/dev/null 2>&1; then
    fail "Supabase CLI not found on PATH. See: https://supabase.com/docs/guides/cli"
  fi

  supabase "$@" \
    --project-ref "${PROJECT_REF}" \
    --access-token "${SUPABASE_ACCESS_TOKEN}"
}

# ---------- Required env ----------

require PROJECT_REF
require SUPABASE_ACCESS_TOKEN

# Feature toggles (default: only Stripe enabled)
ENABLE_STRIPE="${ENABLE_STRIPE:-1}"
ENABLE_SQUARE="${ENABLE_SQUARE:-0}"
ENABLE_AUTHNET="${ENABLE_AUTHNET:-0}"

# ---------- Per‑provider config ----------

push_stripe_secrets() {
  if [[ "${ENABLE_STRIPE}" != "1" ]]; then
    log "Stripe disabled via ENABLE_STRIPE=0 — skipping."
    return 0
  fi

  log "Configuring Stripe secrets in Supabase…"
  require STRIPE_SECRET_KEY
  require STRIPE_WEBHOOK_SECRET

  supa secrets set \
    "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}" \
    "STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}"

  log "Stripe secrets set."
}

push_square_secrets() {
  if [[ "${ENABLE_SQUARE}" != "1" ]]; then
    log "Square disabled via ENABLE_SQUARE=0 — skipping."
    return 0
  fi

  log "Configuring Square secrets in Supabase…"
  require SQUARE_ACCESS_TOKEN
  require SQUARE_WEBHOOK_SIGNATURE_KEY

  supa secrets set \
    "SQUARE_ACCESS_TOKEN=${SQUARE_ACCESS_TOKEN}" \
    "SQUARE_WEBHOOK_SIGNATURE_KEY=${SQUARE_WEBHOOK_SIGNATURE_KEY}"

  log "Square secrets set."
}

push_authnet_secrets() {
  if [[ "${ENABLE_AUTHNET}" != "1" ]]; then
    log "Authorize.net disabled via ENABLE_AUTHNET=0 — skipping."
    return 0
  fi

  log "Configuring Authorize.net secrets in Supabase…"
  require AUTHORIZENET_API_LOGIN_ID
  require AUTHORIZENET_TRANSACTION_KEY
  require AUTHORIZENET_WEBHOOK_SIGNATURE_KEY

  # Allow override of API URL (sandbox vs production)
  AUTHORIZENET_API_URL="${AUTHORIZENET_API_URL:-https://apitest.authorize.net/xml/v1/request.api}"

  supa secrets set \
    "AUTHORIZENET_API_LOGIN_ID=${AUTHORIZENET_API_LOGIN_ID}" \
    "AUTHORIZENET_TRANSACTION_KEY=${AUTHORIZENET_TRANSACTION_KEY}" \
    "AUTHORIZENET_WEBHOOK_SIGNATURE_KEY=${AUTHORIZENET_WEBHOOK_SIGNATURE_KEY}" \
    "AUTHORIZENET_API_URL=${AUTHORIZENET_API_URL}"

  log "Authorize.net secrets set."
}

# ---------- Connectivity sanity checks (lightweight) ----------

check_supabase_link() {
  log "Verifying Supabase project link…"
  # This will fail if the project ref or access token is wrong
  supa db remote commit-history >/dev/null 2>&1 || {
    fail "Supabase CLI cannot reach project ${PROJECT_REF}. Check PROJECT_REF and SUPABASE_ACCESS_TOKEN."
  }
  log "Supabase project reachable."
}

# Placeholder checks — you can extend these once edge functions are deployed.
check_phase_a_ready() {
  log "Phase A basic checks complete. Deeper checks run via validate_phase_a.sh."
}

# ---------- Main ----------

main() {
  log "Starting Phase A provider activation for project: ${PROJECT_REF}"

  check_supabase_link

  push_stripe_secrets
  push_square_secrets
  push_authnet_secrets

  check_phase_a_ready

  log "Phase A activation script completed successfully."
}

main "$@"

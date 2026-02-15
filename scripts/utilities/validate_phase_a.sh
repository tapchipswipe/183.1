#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -f "${REPO_ROOT}/.env" ]]; then
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/.env"
fi

log() {
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

supa() {
  if ! command -v supabase >/dev/null 2>&1; then
    fail "Supabase CLI not found on PATH."
  fi

  supabase "$@" \
    --project-ref "${PROJECT_REF}" \
    --access-token "${SUPABASE_ACCESS_TOKEN}"
}

require PROJECT_REF
require SUPABASE_ACCESS_TOKEN

log "Running Phase A validation for project: ${PROJECT_REF}"

# 1) Check that expected secrets exist in Supabase
log "Checking Supabase secrets…"
SECRETS_JSON="$(supa secrets list --json || true)"

check_secret() {
  local key="$1"
  if echo "${SECRETS_JSON}" | grep -q "\"${key}\""; then
    log "✓ Secret present: ${key}"
  else
    log "⚠ Secret missing: ${key}"
  fi
}

# Only check secrets for enabled providers
[[ "${ENABLE_STRIPE:-1}" == "1" ]] && {
  check_secret "STRIPE_SECRET_KEY"
  check_secret "STRIPE_WEBHOOK_SECRET"
}

[[ "${ENABLE_SQUARE:-0}" == "1" ]] && {
  check_secret "SQUARE_ACCESS_TOKEN"
  check_secret "SQUARE_WEBHOOK_SIGNATURE_KEY"
}

[[ "${ENABLE_AUTHNET:-0}" == "1" ]] && {
  check_secret "AUTHORIZENET_API_LOGIN_ID"
  check_secret "AUTHORIZENET_TRANSACTION_KEY"
  check_secret "AUTHORIZENET_WEBHOOK_SIGNATURE_KEY"
}

# 2) (Optional) Verify there is at least one recent ingestion job / transaction
log "NOTE: deeper validation (edge function calls, test ingestions, webhook tests) should be implemented once those pieces are deployed."

log "Phase A validation script finished. Review warnings above before proceeding to Phase B."

# Phase A - Provider Secrets + Activation Runbook

## Goal
Activate Stripe, Square, and Authorize.net connectors in production and verify ingestion + webhook paths end-to-end.

## Prerequisites
1. Supabase project ref (example: `acrvyexkvtpmyprojdzw`)
2. Supabase PAT in `SUPABASE_ACCESS_TOKEN`
3. Provider credentials available
4. API token for `insights-api` smoke tests

## 1) Set required function secrets
Set all secrets in Supabase:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_WEBHOOK_SIGNATURE_KEY`
- `AUTHORIZENET_API_LOGIN_ID`
- `AUTHORIZENET_TRANSACTION_KEY`
- `AUTHORIZENET_WEBHOOK_SIGNATURE_KEY`
- `AUTHORIZENET_API_URL` (optional; sandbox default exists)

Use:
```bash
scripts/phase_a_activate.sh set-secrets
```

## 2) Verify deployed functions
Required active functions:
- `ingestion-api`
- `processor-jobs`
- `insights-api`

Use:
```bash
scripts/phase_a_activate.sh verify-functions
```

## 3) Run provider sync checks
For each provider (`stripe`, `square`, `authorizenet`):
1. Trigger sync endpoint.
2. Confirm non-error response.
3. Confirm `ingestion_jobs` record exists.
4. Confirm `normalized_transactions` rows were inserted or updated.

Use:
```bash
scripts/phase_a_activate.sh sync stripe
scripts/phase_a_activate.sh sync square
scripts/phase_a_activate.sh sync authorizenet
```

## 4) Run provider backfill checks
For each provider, run backfill with a narrow date window first.

Use:
```bash
scripts/phase_a_activate.sh backfill stripe
scripts/phase_a_activate.sh backfill square
scripts/phase_a_activate.sh backfill authorizenet
```

## 5) Webhook validation checks
For each provider webhook endpoint:
1. Send signed test payload from provider dashboard/tooling.
2. Confirm HTTP `200`/accepted response.
3. Confirm expected upsert behavior in `normalized_transactions`.

Note: Signature generation must match each provider's exact scheme.

## 6) UI verification
In the app:
1. Integrations page shows provider connected.
2. Last sync timestamps update.
3. Retry/error/dead-letter fields populate only on failures.
4. CSV reject report remains functional after provider activation.

## 7) Exit criteria
Phase A is complete when:
1. All provider secrets are set.
2. All three providers pass sync + backfill test once.
3. At least one webhook event per provider is accepted and mapped.
4. No unhandled ingestion job failures remain.

# Credit Card Processing Intelligence Platform

Processor-intelligence application for credit card processing companies. It ingests existing transaction data, normalizes it across providers, and generates analytics + AI-assisted insights.

## Current Implementation Scope

- Processor-first navigation and routing (`Monitoring`, `Merchants`, `Risk`, `Insights`, `Recommendations`, `Integrations`, `Compliance`)
- Legacy retail modules retained under `/legacy/*`
- Phase 1 schema foundation in `supabase/migrations/202602140001_processor_intelligence.sql`
- Ingestion reliability migration in `supabase/migrations/202602140002_ingestion_reliability.sql`
- Phase 2-5 delivery migration in `supabase/migrations/202602140003_phase2_phase5_delivery.sql`
- CSV ingestion flow (app-side import into `normalized_transactions` + `ingestion_jobs`)
- CSV validation + row-level reject reporting in Integrations
- Connector pull + webhook ingestion implemented for Stripe, Square, and Authorize.net
- Ingestion API edge function implementation: `supabase/functions/ingestion-api/index.ts`
- Processor jobs edge function implementation: `supabase/functions/processor-jobs/index.ts`
- Insights API edge function implementation: `supabase/functions/insights-api/index.ts`
- Ingestion reliability baseline:
  - idempotency keys
  - retry metadata + `/v1/ingestion/jobs/:id/retry`
  - connector sync observability (`last_sync_at`, retry/error fields)
- Insights API v1 contract spec: `docs/insights-api-v1.md`

## Setup

1. Install dependencies:
   `npm install`
2. Configure environment variables:
   `cp .env.example .env`
3. Start development server:
   `npm run dev`
4. Build production bundle:
   `npm run build`

## Supabase Setup

1. Apply migration SQL in `supabase/migrations/202602140001_processor_intelligence.sql`.
2. Apply migration SQL in `supabase/migrations/202602140002_ingestion_reliability.sql`.
3. Apply migration SQL in `supabase/migrations/202602140003_phase2_phase5_delivery.sql`.
4. Deploy edge functions:
   - `supabase/functions/ai-chat`
   - `supabase/functions/ingestion-api`
   - `supabase/functions/processor-jobs`
   - `supabase/functions/insights-api`

## Connector Environment Variables (Edge Function)

Set these for `supabase/functions/ingestion-api`:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_WEBHOOK_SIGNATURE_KEY`
- `AUTHORIZENET_API_LOGIN_ID`
- `AUTHORIZENET_TRANSACTION_KEY`
- `AUTHORIZENET_WEBHOOK_SIGNATURE_KEY`
- Optional: `AUTHORIZENET_API_URL` (defaults to sandbox endpoint)

## Security Baseline

- No PAN/CVV fields are stored in application schema.
- Tokenized references only (`card_fingerprint_token`, `raw_ref`).
- RLS policies are included for processor tables based on `user_roles.company_id`.

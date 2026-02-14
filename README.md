# Credit Card Processing Intelligence Platform

Processor-intelligence application for credit card processing companies. It ingests existing transaction data, normalizes it across providers, and generates analytics + AI-assisted insights.

## Current Implementation Scope

- Processor-first navigation and routing (`Monitoring`, `Merchants`, `Risk`, `Insights`, `Recommendations`, `Integrations`, `Compliance`)
- Legacy retail modules retained under `/legacy/*`
- Phase 1 schema foundation in `supabase/migrations/20260214_processor_intelligence.sql`
- CSV ingestion flow (app-side import into `normalized_transactions` + `ingestion_jobs`)
- Connector stubs for Stripe, Square, Authorize.net
- Ingestion API edge function scaffold: `supabase/functions/ingestion-api/index.ts`
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

1. Apply migration SQL in `supabase/migrations/20260214_processor_intelligence.sql`.
2. Deploy edge functions if needed:
   - `supabase/functions/ai-chat`
   - `supabase/functions/ingestion-api`

## Security Baseline

- No PAN/CVV fields are stored in application schema.
- Tokenized references only (`card_fingerprint_token`, `raw_ref`).
- RLS policies are included for processor tables based on `user_roles.company_id`.

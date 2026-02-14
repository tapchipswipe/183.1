# Credit Card Processing Intelligence Platform - Implementation Plan

## Goal
Reposition the product into an AI-powered processor intelligence platform for internal processor teams (risk, operations, leadership), while retaining legacy retail modules under a legacy navigation section.

## Implemented in this commit

### Platform reorientation
- Processor-first routes and information architecture:
  - `Monitoring`, `Merchants`, `Risk`, `Insights`, `Recommendations`, `Integrations`, `Compliance`
- Legacy modules moved under `/legacy/*` routes and grouped in navigation.

### Data and schema foundation
- Added Supabase migration with core processor entities:
  - `processor_connections`
  - `ingestion_jobs`
  - `normalized_transactions`
  - `merchant_profiles`
  - `risk_events`
  - `merchant_scores`
  - `insight_snapshots`
  - `recommendations`
  - `audit_events`
- Added RLS policies scoped by `company_id` and `user_roles`.

### Ingestion and connector scaffolding
- Added connector contracts and stubs for:
  - Stripe
  - Square
  - Authorize.net
- Added ingestion edge-function scaffold (`ingestion-api`) with endpoints for:
  - CSV ingestion jobs
  - Connector connect/sync
  - Webhook intake

### Analytics and insights surface
- Monitoring dashboard implemented using `normalized_transactions`.
- Merchant CRUD using `merchant_profiles`.
- Risk, Insights, and Recommendations pages wired to new tables.
- Integrations page includes CSV bulk ingest and connector status/sync job controls.
- Compliance baseline view added.

### Public API planning
- Added `docs/insights-api-v1.md` as contract-first API spec for future implementation.

## Next implementation phases

### Phase 1 completion
1. Replace connector stubs with real Stripe/Square/Authorize.net pull + webhook handlers.
2. Add robust CSV validation with row-level reject reports.
3. Add idempotency + retry policy for ingestion jobs.

### Phase 2 (AI insights)
1. Rule-based anomaly detection service writing to `risk_events`.
2. Snapshot materialization jobs writing to `insight_snapshots`.
3. LLM narrative summaries with provenance tracking.
4. Recommendation generation pipeline.

### Phase 3 (fraud/security)
1. Velocity checks and geographic anomaly rules.
2. Chargeback risk baseline model.
3. Fraud report export and audit logging expansion.

## Security baseline
- No PAN/CVV persisted in app tables.
- Tokenized references only.
- Company-scoped RLS and audit trail foundation in place.

## Operational checklist
1. Apply migration: `supabase/migrations/20260214_processor_intelligence.sql`
2. Deploy edge function: `supabase/functions/ingestion-api`
3. Verify processor pages against seeded test data.


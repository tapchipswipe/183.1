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

## Delivery status

### Phase 1 completion
1. Done: real Stripe/Square/Authorize.net pull + webhook handlers in `supabase/functions/ingestion-api/index.ts`.
2. Done: robust CSV validation with row-level reject reports in `src/lib/processor-utils.ts` and `src/pages/Integrations.tsx`.
3. Done: idempotency + retry policy for ingestion jobs.
4. Done: connector observability (`last_sync_at`, error reason, retry counters, dead-letter queue path).
5. Done: historical backfill mode with chunked pagination (`/v1/connectors/:provider/backfill`).

### Phase 2 (AI insights)
1. Done: rule-based anomaly detection job writing to `risk_events` (`processor-jobs`).
2. Done: snapshot materialization job writing to `insight_snapshots`.
3. Done: narrative summaries with provenance tracking (`narrative_summary`, `provenance_json`).
4. Done: recommendation generation pipeline.
5. Done: analyst feedback loop via `recommendation_feedback` + recommendation feedback fields.

### Phase 3 (fraud/security)
1. Done: velocity checks and geographic anomaly rules.
2. Done: chargeback risk baseline signal in rules pipeline (heuristic v1).
3. Done: fraud export jobs + audit logging expansion.
4. Done: alert routing to Slack/email/webhook channels with severity thresholds.

### Phase 4 (operator workflows)
1. Done: case management workflow for risk events (owner, SLA, workflow states).
2. Done: merchant scorecard trend comparison (WoW/MoM) in `src/pages/Merchants.tsx`.
3. Done: recommendation lifecycle actions (`accepted`, `rejected`, `deferred`) in `src/pages/Recommendations.tsx`.
4. Done: internal notes and attachment refs on risk cases with audit history.

### Phase 5 (externalization and scale)
1. Done: API contract implemented in `supabase/functions/insights-api/index.ts`.
2. Done: service-token auth with scoped permissions (`service_api_tokens` + scope checks).
3. Done: export job pipeline (`export_jobs`) with target abstraction (`s3`/`gcs`/`download`).
4. Done: performance baseline hardening:
   - daily materialized rollup (`txn_daily_rollups`)
   - indexed ingestion/recommendation/risk paths
   - bounded query limits in API endpoints

## Delivery milestones (target sequence)
1. Milestone A: Ingestion reliability complete (end of Phase 1).
2. Milestone B: First AI insight loop in production (end of Phase 2).
3. Milestone C: Fraud operations workflow live (end of Phase 3 + 4 case management baseline).
4. Milestone D: External API and data export GA (end of Phase 5).

## Cross-phase dependencies
1. `processor_connections` credential lifecycle and secret rotation policy must exist before production connector rollout.
2. Risk scoring and recommendations depend on normalized transaction taxonomy freeze.
3. API GA depends on stable scorecard/summary schemas and pagination model.
4. Alerting and case management require role matrix finalization (`analyst`, `manager`, `admin`).

## Definition of done per phase
1. Technical:
   - migrations applied and versioned
   - integration tests passing for new flows
   - observability dashboards with alerts configured
2. Product:
   - page/API behavior verified against acceptance scenarios
   - user-facing empty/error states implemented
3. Security/compliance:
   - RLS coverage verified
   - audit events emitted for state-changing actions
   - no sensitive PAN/CVV leakage in logs or persisted payloads

## Primary risks and mitigations
1. Connector API drift:
   - mitigate with adapter isolation and provider-specific contract tests.
2. False-positive heavy risk alerts:
   - mitigate with confidence thresholds and analyst feedback tuning loop.
3. Query latency growth with volume:
   - mitigate with partitioning, rollups, and bounded default date windows.
4. Operational overload during launch:
   - mitigate with phased tenant rollout and feature flags by company.

## Security baseline
- No PAN/CVV persisted in app tables.
- Tokenized references only.
- Company-scoped RLS and audit trail foundation in place.

## Operational checklist
1. Apply migration: `supabase/migrations/202602140001_processor_intelligence.sql`
2. Apply migration: `supabase/migrations/202602140002_ingestion_reliability.sql`
3. Apply migration: `supabase/migrations/202602140003_phase2_phase5_delivery.sql`
4. Deploy edge function: `supabase/functions/ingestion-api`
5. Deploy edge function: `supabase/functions/processor-jobs`
6. Deploy edge function: `supabase/functions/insights-api`
7. Seed service API tokens with scoped permissions.
8. Verify processor pages against seeded test data.
9. Enable scheduled jobs for snapshot/risk/recommendation processing.
10. Configure alert channels and on-call routing.

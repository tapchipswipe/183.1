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
4. Add connector observability (`last_sync_at`, error reason, retry counters, dead-letter queue path).
5. Add backfill mode for historical imports with chunked pagination.

### Phase 2 (AI insights)
1. Rule-based anomaly detection service writing to `risk_events`.
2. Snapshot materialization jobs writing to `insight_snapshots`.
3. LLM narrative summaries with provenance tracking.
4. Recommendation generation pipeline.
5. Analyst feedback loop (`helpful/not helpful`, dismissal reason) feeding recommendation tuning.

### Phase 3 (fraud/security)
1. Velocity checks and geographic anomaly rules.
2. Chargeback risk baseline model.
3. Fraud report export and audit logging expansion.
4. Alert routing to Slack/email/webhook destinations with severity thresholds.

### Phase 4 (operator workflows)
1. Case management workflow for risk events:
   - assign owner
   - SLA due date
   - state transitions (`new`, `investigating`, `resolved`, `false_positive`)
2. Merchant scorecard trend comparison (week-over-week, month-over-month).
3. Recommendation lifecycle actions:
   - `accepted`
   - `rejected`
   - `deferred`
4. Internal notes and attachments on merchant/risk records with audit history.

### Phase 5 (externalization and scale)
1. Implement API contract in `docs/insights-api-v1.md` as versioned edge endpoints.
2. Add API auth for service tokens with scoped permissions.
3. Add warehouse export jobs (daily parquet/CSV, S3/GCS target support).
4. Add performance hardening:
   - partitioning/retention for `normalized_transactions`
   - materialized aggregates for dashboard queries
   - p95 endpoint and dashboard render SLO monitoring

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
1. Apply migration: `supabase/migrations/20260214_processor_intelligence.sql`
2. Deploy edge function: `supabase/functions/ingestion-api`
3. Verify processor pages against seeded test data.
4. Enable scheduled jobs for snapshot and risk processing.
5. Configure alert channels and on-call routing.

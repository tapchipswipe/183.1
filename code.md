# Consolidated Code + Remaining Program Plan

## 1) Current Program State (Consolidated)

### Product Scope
This project is now a processor intelligence platform with:
- Processor-focused routes (`Monitoring`, `Merchants`, `Risk`, `Insights`, `Recommendations`, `Integrations`, `Compliance`)
- Legacy modules preserved under `/legacy/*`

### Frontend
Primary app stack:
- React + Vite + TypeScript
- Supabase client integration via `src/integrations/supabase/client.ts`
- Table-driven operational views for merchants, risk, recommendations, integrations, and insights

Implemented workflow surfaces:
- Risk case management: owner assignment, SLA, state transitions, notes
- Recommendations lifecycle: accept/reject/defer + analyst feedback
- Integrations: provider connect/sync/backfill and CSV ingest with reject report
- Insights: pipeline run trigger + export job trigger + snapshot visibility
- Compliance: alert channel config and dispatch visibility

### Database (Supabase)
Migrations now in sequence:
- `supabase/migrations/202602140001_processor_intelligence.sql`
- `supabase/migrations/202602140002_ingestion_reliability.sql`
- `supabase/migrations/202602140003_phase2_phase5_delivery.sql`

Core entities include:
- Ingestion: `processor_connections`, `ingestion_jobs`, `normalized_transactions`
- Core domain: `merchant_profiles`, `risk_events`, `merchant_scores`, `insight_snapshots`, `recommendations`, `audit_events`
- Phase 2-5 additions: `recommendation_feedback`, `risk_case_notes`, `alert_channels`, `alert_dispatches`, `export_jobs`, `service_api_tokens`
- Performance baseline: `txn_daily_rollups` materialized view

### Edge Functions
Deployed/implemented:
- `supabase/functions/ingestion-api/index.ts`
  - Provider sync for Stripe/Square/Authorize.net
  - Backfill ingestion by page window
  - Webhook intake and signature validation
  - Idempotent job handling and retry metadata
- `supabase/functions/processor-jobs/index.ts`
  - Rule-based anomaly generation
  - Snapshot materialization
  - Merchant score generation
  - Recommendation generation
  - Alert dispatch fanout
  - Export job execution scaffold
- `supabase/functions/insights-api/index.ts`
  - External metrics/risk/recommendation/scorecard API endpoints
  - Service token hash auth + scope enforcement

### API Token/Auth Model
- Service tokens are plain tokens hashed as SHA-256 into `service_api_tokens.token_hash`
- `insights-api` validates bearer token hash + scopes
- Scope examples: `metrics:read`, `risk:read`, `merchant:read`, `recommendations:read`

### Security Baseline
- No PAN/CVV persisted in tables
- Tokenized refs and audit trail expansion in place
- RLS policies based on `user_roles.company_id`

## 2) Remaining Plan (Program Completion to Production)

The platform is functionally complete for the planned feature set. Remaining work is production hardening and operationalization.

### Phase A: Secrets + Provider Activation (Immediate)
1. Set production secrets in Supabase function secrets:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `SQUARE_ACCESS_TOKEN`
   - `SQUARE_WEBHOOK_SIGNATURE_KEY`
   - `AUTHORIZENET_API_LOGIN_ID`
   - `AUTHORIZENET_TRANSACTION_KEY`
   - `AUTHORIZENET_WEBHOOK_SIGNATURE_KEY`
2. Validate each provider with one end-to-end sync and one webhook event.
3. Confirm connector status/error/retry fields update as expected in UI.

### Phase B: Testing + QA Gate
1. Add integration tests for:
   - `ingestion-api` sync/backfill/idempotency/retry
   - `processor-jobs` anomaly/snapshot/recommendation/alerts
   - `insights-api` scope and token checks
2. Add regression tests for risk workflow + recommendation actions.
3. Add seed fixtures for deterministic test datasets.
4. Define pass/fail QA checklist for release.

### Phase C: Operational Reliability
1. Configure scheduled job cadence:
   - Daily pipeline (`run-daily`)
   - Optional intra-day anomaly refresh
2. Add dead-letter reprocessing command for failed ingestion jobs.
3. Add alerting/monitoring for:
   - Function failures
   - Ingestion failure rate
   - API p95 latency
4. Add runbooks for on-call triage.

### Phase D: Performance + Cost Hardening
1. Add retention policy for aged `normalized_transactions` data.
2. Add rollup refresh strategy for `txn_daily_rollups`.
3. Bound default API query windows and enforce pagination limits.
4. Profile heavy dashboard queries and add indexes where needed.

### Phase E: Release + Governance
1. Define environment promotion flow (dev -> staging -> prod).
2. Rotate temporary credentials/tokens used during setup.
3. Publish API usage documentation for integrators.
4. Add role matrix verification for `analyst`, `manager`, `admin` actions.
5. Execute go-live checklist and incident rollback checklist.

## 3) Definition of Program Done
Program is considered done when:
1. All provider secrets are configured and provider ingest is validated in production.
2. Scheduled jobs run reliably with monitored SLAs.
3. Integration and regression test suite passes in CI.
4. External Insights API is live with scoped service tokens and documented usage.
5. On-call/runbook + incident response process is in place.

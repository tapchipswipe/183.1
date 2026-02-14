# 183.1 - Processor Intelligence Hardening (Phases B/C/D)

This repository now contains:
- Phase B: test harness + integration/regression suites + CI workflows
- Phase C: scheduled-jobs reliability function + scheduler tables + monitoring runbooks
- Phase D: retention/rollup/index migrations + insights query optimizer + performance SQL

## Local setup

```bash
npm install
npm run typecheck
npm test
```

## Integration tests

1. Copy `.env.test.example` to `.env.test` and fill Supabase values.
2. Set `RUN_INTEGRATION_TESTS=true`.
3. Run:

```bash
npm run test:integration
```

## Supabase migration + function deployment

```bash
supabase db push
supabase functions deploy ingestion-api
supabase functions deploy processor-jobs
supabase functions deploy insights-api
supabase functions deploy scheduled-jobs
```

## Added key files

- `vitest.config.ts`
- `tests/setup.ts`
- `tests/integration/*.test.ts`
- `tests/regression/risk-workflow.test.ts`
- `tests/unit/scheduled-jobs-contract.test.ts`
- `supabase/functions/scheduled-jobs/index.ts`
- `supabase/functions/scheduled-jobs/job-contract.ts`
- `supabase/migrations/202602140004_scheduled_jobs.sql`
- `supabase/migrations/202602140005_data_retention.sql`
- `supabase/migrations/202602140006_rollup_optimization.sql`
- `supabase/migrations/202602140007_performance_indexes.sql`
- `monitoring/alerts.yaml`
- `monitoring/runbooks/*.md`
- `monitoring/performance-queries.sql`

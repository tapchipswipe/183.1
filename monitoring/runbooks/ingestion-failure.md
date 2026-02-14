# Runbook: Ingestion Failure

## Trigger
Alert `ingestion_job_failure_rate_high` fires.

## Immediate Actions
1. Check failed jobs in `ingestion_jobs` for common provider/error patterns.
2. Confirm provider credential validity in Supabase secrets.
3. Verify `ingestion-api` function logs for exceptions and timeout spikes.

## Queries
```sql
select provider, status, retry_count, error_message, created_at
from ingestion_jobs
where created_at > now() - interval '2 hours'
order by created_at desc;
```

## Recovery
1. Resolve root cause (credential rotation, provider outage, payload validation issue).
2. Trigger scheduled dead-letter retry:
```bash
curl -X POST "$SUPABASE_URL/functions/v1/scheduled-jobs" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"job_type":"dead_letter_retry"}'
```
3. Confirm failure rate drops under threshold for at least 30 minutes.

## Post-Incident
1. Record timeline and corrective action.
2. If noisy, tune threshold in `monitoring/alerts.yaml`.

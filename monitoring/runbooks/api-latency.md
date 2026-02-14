# Runbook: API Latency

## Trigger
Alert `api_p95_latency_high` fires.

## Immediate Actions
1. Identify affected endpoint and time window.
2. Check database saturation and long-running queries.
3. Confirm API request window/pagination parameters are bounded.

## Queries
```sql
select query, calls, total_exec_time, mean_exec_time
from pg_stat_statements
order by total_exec_time desc
limit 20;
```

```sql
explain analyze
select snapshot_date, metrics
from insight_snapshots
where company_id = 'test-company-1'
order by snapshot_date desc
limit 50;
```

## Recovery
1. Apply missing index migrations if pending.
2. Reduce API window defaults and enforce max limits.
3. Refresh rollups if stale:
```sql
select refresh_txn_daily_rollups();
```

## Post-Incident
1. Document RCA and slow query classes.
2. Update this runbook and thresholds if needed.

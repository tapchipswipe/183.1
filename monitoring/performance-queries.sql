-- Ingestion reliability
select
  date_trunc('hour', created_at) as hour,
  count(*) filter (where status = 'failed') as failed_jobs,
  count(*) as total_jobs,
  round((count(*) filter (where status = 'failed')::numeric / nullif(count(*), 0)) * 100, 2) as failure_pct
from ingestion_jobs
where created_at > now() - interval '24 hours'
group by 1
order by 1 desc;

-- Dead-letter queue pressure
select count(*) as pending_retries
from ingestion_jobs
where status = 'failed' and retry_count < 3;

-- Alert dispatch health
select status, count(*)
from alert_dispatches
where created_at > now() - interval '24 hours'
group by status;

-- Rollup freshness
select * from txn_daily_rollup_health;

-- Snapshot availability
select company_id, max(snapshot_date) as latest_snapshot, count(*) as snapshot_count
from insight_snapshots
group by company_id;

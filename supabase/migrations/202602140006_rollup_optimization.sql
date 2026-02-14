create index if not exists idx_normalized_transactions_rollup_base
  on normalized_transactions(txn_date, processor, txn_status);

create or replace function refresh_txn_daily_rollups()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view txn_daily_rollups;
end;
$$;

create or replace view txn_daily_rollup_health as
select
  now() as checked_at,
  coalesce(max(txn_date), '1970-01-01'::date) as latest_rollup_date,
  count(*)::bigint as rollup_rows
from txn_daily_rollups;

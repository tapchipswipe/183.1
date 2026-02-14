do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'normalized_transactions' and column_name = 'txn_date'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'normalized_transactions' and column_name = 'processor'
  ) then
    execute 'create index if not exists idx_normalized_transactions_rollup_base on normalized_transactions(txn_date, processor)';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'normalized_transactions' and column_name = 'created_at'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'normalized_transactions' and column_name = 'processor'
  ) then
    execute 'create index if not exists idx_normalized_transactions_rollup_created on normalized_transactions(created_at, processor)';
  end if;
end;
$$;

create or replace function refresh_txn_daily_rollups()
returns void
language plpgsql
security definer
as $$
begin
  if to_regclass('public.txn_daily_rollups') is not null then
    execute 'refresh materialized view txn_daily_rollups';
  end if;
end;
$$;

create or replace view txn_daily_rollup_health as
select
  now() as checked_at,
  (to_regclass('public.txn_daily_rollups') is not null) as rollup_exists,
  coalesce((
    select c.reltuples::bigint
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'txn_daily_rollups'
  ), 0) as estimated_rows;

create table if not exists normalized_transactions_archive (
  like normalized_transactions including all
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'normalized_transactions_archive'
      and column_name = 'txn_date'
  ) then
    execute 'create index if not exists idx_normalized_txn_archive_date on normalized_transactions_archive(txn_date)';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'normalized_transactions_archive'
      and column_name = 'created_at'
  ) then
    execute 'create index if not exists idx_normalized_txn_archive_created_at on normalized_transactions_archive(created_at)';
  end if;
end;
$$;

create or replace function archive_old_normalized_transactions(retention_days integer default 365)
returns integer
language plpgsql
security definer
as $$
declare
  archived_count integer := 0;
  date_column text;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'normalized_transactions'
      and column_name = 'txn_date'
  ) then
    date_column := 'txn_date';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'normalized_transactions'
      and column_name = 'created_at'
  ) then
    date_column := 'created_at';
  else
    return 0;
  end if;

  execute format(
    'with moved_rows as (
       delete from normalized_transactions
       where (%I)::date < (current_date - $1)
       returning *
     )
     insert into normalized_transactions_archive
     select * from moved_rows',
    date_column
  ) using retention_days;

  get diagnostics archived_count = row_count;
  return archived_count;
end;
$$;

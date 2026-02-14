create table if not exists normalized_transactions_archive (
  like normalized_transactions including all
);

create index if not exists idx_normalized_txn_archive_date
  on normalized_transactions_archive(txn_date);

create or replace function archive_old_normalized_transactions(retention_days integer default 365)
returns integer
language plpgsql
security definer
as $$
declare
  archived_count integer := 0;
begin
  with moved_rows as (
    delete from normalized_transactions
    where txn_date < (current_date - retention_days)
    returning *
  )
  insert into normalized_transactions_archive
  select * from moved_rows;

  get diagnostics archived_count = row_count;
  return archived_count;
end;
$$;

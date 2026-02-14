-- Phase 1 completion: ingestion idempotency, retries, and connector observability

alter table public.processor_connections
  add column if not exists last_sync_at timestamptz,
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists dead_letter_ref text;

alter table public.ingestion_jobs
  add column if not exists idempotency_key text,
  add column if not exists retry_count integer not null default 0,
  add column if not exists max_retries integer not null default 3,
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_error text,
  add column if not exists rejected_rows_json jsonb;

create unique index if not exists ingestion_jobs_company_source_idempotency_uidx
  on public.ingestion_jobs (company_id, source_type, idempotency_key)
  where idempotency_key is not null;

create index if not exists ingestion_jobs_status_next_retry_idx
  on public.ingestion_jobs (status, next_retry_at);

create index if not exists processor_connections_company_provider_idx
  on public.processor_connections (company_id, provider);

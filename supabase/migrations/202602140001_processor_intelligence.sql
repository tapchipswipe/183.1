create extension if not exists pgcrypto;

create table if not exists companies (
  id text primary key,
  company_name text not null,
  industry text,
  created_at timestamptz not null default now()
);

create table if not exists user_roles (
  user_id text not null,
  company_id text not null references companies(id) on delete cascade,
  role text not null check (role in ('analyst', 'manager', 'admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create table if not exists processor_connections (
  id text primary key default ('conn-' || gen_random_uuid()::text),
  company_id text not null references companies(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'square', 'authorize_net', 'authorizenet')),
  account_id text not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'error')),
  credentials_encrypted jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists merchant_profiles (
  id text primary key,
  company_id text not null references companies(id) on delete cascade,
  external_merchant_id text,
  business_name text not null,
  industry text,
  risk_tier text not null default 'medium' check (risk_tier in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  connection_id text references processor_connections(id) on delete set null,
  provider text not null,
  job_type text not null check (job_type in ('sync', 'backfill', 'webhook', 'retry')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  idempotency_key text,
  error_message text,
  retry_count int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, idempotency_key)
);

create table if not exists normalized_transactions (
  id uuid primary key default gen_random_uuid(),
  merchant_id text references merchant_profiles(id) on delete set null,
  txn_date date not null,
  txn_amount numeric(12,2) not null,
  txn_status text not null check (txn_status in ('completed', 'failed', 'pending')),
  processor text not null,
  processor_txn_id text not null,
  created_at timestamptz not null default now(),
  unique (processor, processor_txn_id)
);

create table if not exists risk_events (
  id text primary key,
  merchant_id text not null references merchant_profiles(id) on delete cascade,
  event_type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'dismissed')),
  description text,
  owner_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists risk_case_notes (
  id uuid primary key default gen_random_uuid(),
  risk_event_id text not null references risk_events(id) on delete cascade,
  author_user_id text not null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists recommendations (
  id text primary key,
  merchant_id text not null references merchant_profiles(id) on delete cascade,
  recommendation_type text not null,
  priority text not null check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'deferred')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  recommendation_id text not null references recommendations(id) on delete cascade,
  reviewer_user_id text not null,
  action text not null check (action in ('accepted', 'rejected', 'deferred')),
  feedback text,
  created_at timestamptz not null default now()
);

create table if not exists merchant_scores (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null references merchant_profiles(id) on delete cascade,
  score_date date not null,
  risk_score numeric(5,2) not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (merchant_id, score_date)
);

create table if not exists insight_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  company_id text not null references companies(id) on delete cascade,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (snapshot_date, company_id)
);

create table if not exists alert_channels (
  id text primary key,
  company_id text not null references companies(id) on delete cascade,
  channel_type text not null check (channel_type in ('email', 'slack', 'webhook')),
  destination text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists alert_dispatches (
  id text primary key default ('dispatch-' || gen_random_uuid()::text),
  risk_event_id text references risk_events(id) on delete set null,
  channel_id text references alert_channels(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists service_api_tokens (
  id text primary key,
  company_id text not null references companies(id) on delete cascade,
  token_name text not null,
  token_hash text not null unique,
  scopes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists export_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references companies(id) on delete cascade,
  export_type text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  destination text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id text references companies(id) on delete cascade,
  actor_user_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create materialized view if not exists txn_daily_rollups as
select
  txn_date,
  processor,
  count(*)::bigint as txn_count,
  sum(txn_amount)::numeric(14,2) as total_amount,
  avg(txn_amount)::numeric(14,2) as avg_amount
from normalized_transactions
group by txn_date, processor;

create unique index if not exists idx_txn_daily_rollups_day_processor
on txn_daily_rollups (txn_date, processor);

create or replace function refresh_txn_daily_rollups()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view txn_daily_rollups;
end;
$$;

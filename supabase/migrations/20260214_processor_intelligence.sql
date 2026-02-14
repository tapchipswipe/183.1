-- Processor Intelligence Platform foundational schema (Phase 1)

create table if not exists public.processor_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  provider text not null check (provider in ('stripe', 'square', 'authorizenet')),
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'error')),
  credentials_ref text,
  webhook_secret_ref text,
  created_at timestamptz not null default now(),
  unique(company_id, provider)
);

create table if not exists public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  source_type text not null check (source_type in ('csv', 'stripe', 'square', 'authorizenet')),
  source_ref text,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  started_at timestamptz,
  finished_at timestamptz,
  stats_json jsonb,
  error_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.merchant_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  external_merchant_id text,
  legal_name text not null,
  dba_name text,
  vertical text,
  country text,
  risk_tier text,
  status text default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.normalized_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  source_provider text not null check (source_provider in ('csv', 'stripe', 'square', 'authorizenet')),
  source_txn_id text not null,
  merchant_id uuid references public.merchant_profiles(id) on delete set null,
  card_fingerprint_token text,
  amount numeric(14,2) not null default 0,
  currency text not null default 'USD',
  approved boolean not null default true,
  decline_code text,
  avs_result text,
  cvv_result text,
  mcc text,
  country text,
  region text,
  channel text,
  occurred_at timestamptz not null,
  settled_at timestamptz,
  raw_ref text,
  payment_method text,
  created_at timestamptz not null default now(),
  unique(company_id, source_provider, source_txn_id)
);

create table if not exists public.risk_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  transaction_id uuid references public.normalized_transactions(id) on delete set null,
  event_type text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  score numeric(6,2),
  reasons_json jsonb,
  detected_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  created_at timestamptz not null default now()
);

create table if not exists public.merchant_scores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  merchant_id uuid not null references public.merchant_profiles(id) on delete cascade,
  score_type text not null,
  score_value numeric(8,3) not null,
  factors_json jsonb,
  as_of timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.insight_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  metric_key text not null,
  metric_value numeric(16,4) not null,
  breakdown_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  merchant_id uuid references public.merchant_profiles(id) on delete set null,
  category text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  recommendation_text text not null,
  expected_impact_json jsonb,
  status text not null default 'open' check (status in ('open', 'accepted', 'dismissed')),
  model text,
  prompt_version text,
  snapshot_refs jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.processor_connections enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.merchant_profiles enable row level security;
alter table public.normalized_transactions enable row level security;
alter table public.risk_events enable row level security;
alter table public.merchant_scores enable row level security;
alter table public.insight_snapshots enable row level security;
alter table public.recommendations enable row level security;
alter table public.audit_events enable row level security;

create policy if not exists processor_connections_company_read on public.processor_connections
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists processor_connections_company_write on public.processor_connections
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

create policy if not exists ingestion_jobs_company_read on public.ingestion_jobs
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists ingestion_jobs_company_write on public.ingestion_jobs
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

create policy if not exists merchant_profiles_company_read on public.merchant_profiles
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists merchant_profiles_company_write on public.merchant_profiles
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

create policy if not exists normalized_transactions_company_read on public.normalized_transactions
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists normalized_transactions_company_write on public.normalized_transactions
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

create policy if not exists risk_events_company_read on public.risk_events
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists risk_events_company_write on public.risk_events
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

create policy if not exists merchant_scores_company_read on public.merchant_scores
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists merchant_scores_company_write on public.merchant_scores
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

create policy if not exists insight_snapshots_company_read on public.insight_snapshots
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists insight_snapshots_company_write on public.insight_snapshots
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

create policy if not exists recommendations_company_read on public.recommendations
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists recommendations_company_write on public.recommendations
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

create policy if not exists audit_events_company_read on public.audit_events
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists audit_events_company_write on public.audit_events
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

-- Phase 2-5 delivery: AI insights, fraud workflows, external API auth, alerting, exports

alter table public.risk_events
  add column if not exists workflow_state text not null default 'new'
    check (workflow_state in ('new', 'investigating', 'resolved', 'false_positive')),
  add column if not exists owner_user_id uuid,
  add column if not exists sla_due_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists disposition_note text;

alter table public.recommendations
  add column if not exists lifecycle_state text not null default 'open'
    check (lifecycle_state in ('open', 'accepted', 'rejected', 'deferred')),
  add column if not exists confidence numeric(5,2),
  add column if not exists analyst_feedback text
    check (analyst_feedback in ('helpful', 'not_helpful') or analyst_feedback is null),
  add column if not exists analyst_feedback_reason text,
  add column if not exists actioned_at timestamptz;

alter table public.insight_snapshots
  add column if not exists narrative_summary text,
  add column if not exists provenance_json jsonb,
  add column if not exists model text,
  add column if not exists prompt_version text;

create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  user_id uuid,
  feedback text not null check (feedback in ('helpful', 'not_helpful')),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.risk_case_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  risk_event_id uuid not null references public.risk_events(id) on delete cascade,
  note text not null,
  attachment_ref text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.alert_channels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  channel_type text not null check (channel_type in ('slack', 'email', 'webhook')),
  destination text not null,
  min_severity text not null default 'high' check (min_severity in ('low', 'medium', 'high', 'critical')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, channel_type, destination)
);

create table if not exists public.alert_dispatches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  risk_event_id uuid references public.risk_events(id) on delete set null,
  channel_id uuid references public.alert_channels(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  payload_json jsonb,
  error_message text,
  attempted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  export_format text not null check (export_format in ('csv', 'parquet')),
  target text not null check (target in ('s3', 'gcs', 'download')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  period_start timestamptz,
  period_end timestamptz,
  file_ref text,
  stats_json jsonb,
  error_json jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.service_api_tokens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  name text not null,
  token_hash text not null unique,
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'revoked')),
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create materialized view if not exists public.txn_daily_rollups as
select
  company_id,
  date_trunc('day', occurred_at) as period_day,
  count(*)::bigint as tx_count,
  sum(amount)::numeric(14,2) as volume,
  sum(case when approved then amount else 0 end)::numeric(14,2) as approved_volume,
  sum(case when not approved then 1 else 0 end)::bigint as declines
from public.normalized_transactions
group by company_id, date_trunc('day', occurred_at);

create unique index if not exists txn_daily_rollups_uidx
  on public.txn_daily_rollups(company_id, period_day);

create index if not exists risk_events_workflow_state_idx
  on public.risk_events(company_id, workflow_state, severity, detected_at desc);

create index if not exists recommendations_lifecycle_idx
  on public.recommendations(company_id, lifecycle_state, priority, created_at desc);

create index if not exists service_api_tokens_company_status_idx
  on public.service_api_tokens(company_id, status);

create index if not exists export_jobs_company_status_idx
  on public.export_jobs(company_id, status, created_at desc);

alter table public.recommendation_feedback enable row level security;
alter table public.risk_case_notes enable row level security;
alter table public.alert_channels enable row level security;
alter table public.alert_dispatches enable row level security;
alter table public.export_jobs enable row level security;
alter table public.service_api_tokens enable row level security;

create policy if not exists recommendation_feedback_company_read on public.recommendation_feedback
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists recommendation_feedback_company_write on public.recommendation_feedback
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

create policy if not exists risk_case_notes_company_read on public.risk_case_notes
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists risk_case_notes_company_write on public.risk_case_notes
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

create policy if not exists alert_channels_company_read on public.alert_channels
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists alert_channels_company_write on public.alert_channels
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

create policy if not exists alert_dispatches_company_read on public.alert_dispatches
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists alert_dispatches_company_write on public.alert_dispatches
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

create policy if not exists export_jobs_company_read on public.export_jobs
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists export_jobs_company_write on public.export_jobs
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

create policy if not exists service_api_tokens_company_read on public.service_api_tokens
for select using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));
create policy if not exists service_api_tokens_company_write on public.service_api_tokens
for all using (company_id in (select company_id from public.user_roles where user_id = auth.uid()));

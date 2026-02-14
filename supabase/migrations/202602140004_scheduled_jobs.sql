create table if not exists scheduled_job_config (
  id uuid primary key default gen_random_uuid(),
  job_name text not null unique,
  job_type text not null,
  cron_schedule text not null,
  is_enabled boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  timeout_seconds integer not null default 300,
  retry_policy jsonb not null default '{"max_retries":3,"backoff_multiplier":2}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scheduled_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_config_id uuid references scheduled_job_config(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null check (status in ('running', 'completed', 'failed', 'timeout')),
  error_message text,
  execution_time_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into scheduled_job_config (job_name, job_type, cron_schedule, is_enabled)
values
  ('daily_pipeline', 'daily_pipeline', '0 2 * * *', true),
  ('anomaly_refresh', 'anomaly_refresh', '0 */6 * * *', true),
  ('dead_letter_retry', 'dead_letter_retry', '0 * * * *', true),
  ('rollup_refresh', 'rollup_refresh', '15 2 * * *', true)
on conflict (job_name) do update set
  job_type = excluded.job_type,
  cron_schedule = excluded.cron_schedule,
  is_enabled = excluded.is_enabled,
  updated_at = now();

create index if not exists idx_scheduled_job_runs_started
  on scheduled_job_runs(started_at desc);
create index if not exists idx_scheduled_job_runs_status
  on scheduled_job_runs(status);
create index if not exists idx_scheduled_job_config_next_run
  on scheduled_job_config(next_run_at)
  where is_enabled = true;

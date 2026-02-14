do $$
begin
  if to_regclass('public.ingestion_jobs') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingestion_jobs' and column_name='status')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingestion_jobs' and column_name='retry_count')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingestion_jobs' and column_name='created_at') then
    execute 'create index if not exists idx_ingestion_jobs_failed_retry on ingestion_jobs(status, retry_count, created_at) where status = ''failed'' and retry_count < 3';
  end if;

  if to_regclass('public.ingestion_jobs') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingestion_jobs' and column_name='provider')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingestion_jobs' and column_name='status')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingestion_jobs' and column_name='created_at') then
    execute 'create index if not exists idx_ingestion_jobs_provider_status on ingestion_jobs(provider, status, created_at desc)';
  end if;

  if to_regclass('public.risk_events') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='risk_events' and column_name='status')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='risk_events' and column_name='severity')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='risk_events' and column_name='created_at') then
    execute 'create index if not exists idx_risk_events_status_severity on risk_events(status, severity, created_at desc)';
  end if;

  if to_regclass('public.recommendations') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='recommendations' and column_name='status')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='recommendations' and column_name='priority')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='recommendations' and column_name='created_at') then
    execute 'create index if not exists idx_recommendations_status_priority on recommendations(status, priority, created_at desc)';
  end if;

  if to_regclass('public.alert_dispatches') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='alert_dispatches' and column_name='risk_event_id')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='alert_dispatches' and column_name='status')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='alert_dispatches' and column_name='sent_at') then
    execute 'create index if not exists idx_alert_dispatches_risk_event on alert_dispatches(risk_event_id, status, sent_at desc)';
  end if;

  if to_regclass('public.alert_dispatches') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='alert_dispatches' and column_name='channel_id')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='alert_dispatches' and column_name='status')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='alert_dispatches' and column_name='created_at') then
    execute 'create index if not exists idx_alert_dispatches_channel_status on alert_dispatches(channel_id, status, created_at desc)';
  end if;

  if to_regclass('public.insight_snapshots') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='insight_snapshots' and column_name='company_id')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='insight_snapshots' and column_name='snapshot_date') then
    execute 'create index if not exists idx_insight_snapshots_company_date on insight_snapshots(company_id, snapshot_date desc)';
  end if;
end;
$$;

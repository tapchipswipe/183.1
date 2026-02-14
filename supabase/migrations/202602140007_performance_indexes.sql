create index if not exists idx_ingestion_jobs_failed_retry
  on ingestion_jobs(status, retry_count, created_at)
  where status = 'failed' and retry_count < 3;

create index if not exists idx_ingestion_jobs_provider_status
  on ingestion_jobs(provider, status, created_at desc);

create index if not exists idx_risk_events_status_severity
  on risk_events(status, severity, created_at desc);

create index if not exists idx_recommendations_status_priority
  on recommendations(status, priority, created_at desc);

create index if not exists idx_alert_dispatches_risk_event
  on alert_dispatches(risk_event_id, status, sent_at desc);

create index if not exists idx_alert_dispatches_channel_status
  on alert_dispatches(channel_id, status, created_at desc);

create index if not exists idx_insight_snapshots_company_date
  on insight_snapshots(company_id, snapshot_date desc);

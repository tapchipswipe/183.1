export const jobTypes = ['daily_pipeline', 'anomaly_refresh', 'dead_letter_retry', 'rollup_refresh'] as const

export type JobType = (typeof jobTypes)[number]

export function isJobType(input: string): input is JobType {
  return jobTypes.includes(input as JobType)
}

export function validateScheduledJobPayload(payload: unknown): { ok: true; jobType: JobType } | { ok: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Invalid JSON body' }
  }

  const candidate = (payload as Record<string, unknown>).job_type
  if (typeof candidate !== 'string' || !isJobType(candidate)) {
    return {
      ok: false,
      error: 'job_type must be one of daily_pipeline, anomaly_refresh, dead_letter_retry, rollup_refresh',
    }
  }

  return { ok: true, jobType: candidate }
}

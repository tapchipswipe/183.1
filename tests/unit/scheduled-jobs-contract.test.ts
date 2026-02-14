import { describe, it, expect } from 'vitest'
import { isJobType, validateScheduledJobPayload } from '../../supabase/functions/scheduled-jobs/job-contract'

describe('scheduled jobs request contract', () => {
  it('accepts supported job types', () => {
    expect(isJobType('daily_pipeline')).toBe(true)
    expect(isJobType('anomaly_refresh')).toBe(true)
    expect(isJobType('dead_letter_retry')).toBe(true)
    expect(isJobType('rollup_refresh')).toBe(true)
  })

  it('rejects unsupported job types', () => {
    expect(isJobType('foo')).toBe(false)
    expect(validateScheduledJobPayload({ job_type: 'foo' }).ok).toBe(false)
  })

  it('validates malformed payloads', () => {
    expect(validateScheduledJobPayload(null)).toEqual({ ok: false, error: 'Invalid JSON body' })
    expect(validateScheduledJobPayload({})).toEqual({
      ok: false,
      error: 'job_type must be one of daily_pipeline, anomaly_refresh, dead_letter_retry, rollup_refresh',
    })
  })
})

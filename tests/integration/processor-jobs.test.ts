import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true'
const describeIf = runIntegration ? describe : describe.skip

const supabaseUrl = process.env.SUPABASE_URL ?? ""
const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? ""
const functionUrl = process.env.PROCESSOR_JOBS_FUNCTION_URL ?? `/functions/v1/processor-jobs`

const supabase = runIntegration ? createClient(supabaseUrl, serviceKey) : null

describeIf('Processor Jobs integration', () => {
  beforeAll(async () => {
    await supabase!.from('merchant_profiles').upsert({
      id: 'merchant-processor-test',
      company_id: 'test-company-1',
      business_name: 'Processor Merchant',
      industry: 'retail',
      risk_tier: 'medium',
    })

    await supabase!.from('alert_channels').upsert({
      id: 'alert-ch-proc',
      company_id: 'test-company-1',
      channel_type: 'email',
      destination: 'ops@test.com',
      is_active: true,
    })
  })

  it('runs anomaly detection', async () => {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ job_type: 'anomaly_detection' }),
    })

    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.success).toBe(true)
  })

  it('generates recommendations', async () => {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ job_type: 'recommendation_generation' }),
    })

    expect(response.status).toBe(200)

    const { data } = await supabase!.from('recommendations').select('id').ilike('id', 'rec-auto-%').limit(1)
    expect((data?.length ?? 0) >= 1).toBe(true)
  })

  it('dispatches alerts', async () => {
    await supabase!.from('risk_events').upsert({
      id: 'risk-proc-1',
      merchant_id: 'merchant-processor-test',
      event_type: 'volume_spike',
      severity: 'high',
      status: 'open',
      description: 'High risk test event',
    })

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ job_type: 'alert_dispatch', severity_filter: 'high' }),
    })

    expect(response.status).toBe(200)

    const { data } = await supabase!.from('alert_dispatches').select('id,status').ilike('id', 'dispatch-auto-%').limit(1)
    expect((data?.length ?? 0) >= 1).toBe(true)
  })
})

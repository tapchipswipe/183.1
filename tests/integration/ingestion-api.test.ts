import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true'
const describeIf = runIntegration ? describe : describe.skip

const supabaseUrl = process.env.SUPABASE_URL ?? ""
const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? ""
const functionUrl = process.env.INGESTION_FUNCTION_URL ?? `/functions/v1/ingestion-api`

const supabase = runIntegration ? createClient(supabaseUrl, serviceKey) : null

describeIf('Ingestion API integration', () => {
  let testConnectionId = 'conn-stripe-1'

  beforeAll(async () => {
    await supabase!.from('processor_connections').upsert({
      id: testConnectionId,
      company_id: 'test-company-1',
      provider: 'stripe',
      account_id: 'test_acct_123',
      status: 'active',
      credentials_encrypted: { api_key: 'test_key' },
    })
  })

  afterAll(async () => {
    await supabase!.from('ingestion_jobs').delete().eq('provider', 'stripe')
    await supabase!.from('processor_connections').delete().eq('id', testConnectionId)
  })

  it('creates sync job', async () => {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        action: 'sync',
        connection_id: testConnectionId,
        provider: 'stripe',
      }),
    })

    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.job_id).toBeDefined()
    expect(result.status).toBe('processing')

    const { data: job } = await supabase!.from('ingestion_jobs').select('id,status').eq('id', result.job_id).single()
    expect(job?.id).toBe(result.job_id)
    expect(['processing', 'completed']).toContain(job?.status)
  })

  it('reuses idempotent submission', async () => {
    const payload = {
      action: 'sync',
      connection_id: testConnectionId,
      provider: 'stripe',
      idempotency_key: 'test-idem-key-001',
    }

    const response1 = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(payload),
    })
    const result1 = await response1.json()

    const response2 = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(payload),
    })
    const result2 = await response2.json()

    expect(result2.job_id).toBe(result1.job_id)
    expect(String(result2.message).toLowerCase()).toContain('idempotency')
  })

  it('updates retry count on retry action', async () => {
    const { data: failedJob } = await supabase!
      .from('ingestion_jobs')
      .insert({
        connection_id: testConnectionId,
        provider: 'stripe',
        job_type: 'sync',
        status: 'failed',
        error_message: 'Test failure',
        retry_count: 0,
      })
      .select('id')
      .single()

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ action: 'retry', job_id: failedJob?.id }),
    })

    expect(response.status).toBe(200)

    const { data: retriedJob } = await supabase!
      .from('ingestion_jobs')
      .select('retry_count,status')
      .eq('id', failedJob?.id)
      .single()

    expect((retriedJob?.retry_count ?? 0) > 0).toBe(true)
    expect(retriedJob?.status).toBe('processing')
  })
})

import { describe, it, expect } from 'vitest'

const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true'
const describeIf = runIntegration ? describe : describe.skip

const supabaseUrl = process.env.SUPABASE_URL ?? ""
const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? ""
const functionUrl = process.env.INSIGHTS_FUNCTION_URL ?? `${supabaseUrl}/functions/v1/insights-api`

describeIf('Insights API integration', () => {
  it('returns metrics with service key authorization', async () => {
    const response = await fetch(`${functionUrl}/metrics`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
      },
    })

    expect(response.status).toBe(200)
    const result = await response.json()
    expect(Array.isArray(result.items)).toBe(true)
  })

  it('rejects unknown endpoint', async () => {
    const response = await fetch(`${functionUrl}/unknown`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
      },
    })

    expect(response.status).toBe(404)
  })
})

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const internalToken = Deno.env.get('INTERNAL_JOB_TOKEN')

type JobType =
  | 'snapshot_generation'
  | 'anomaly_detection'
  | 'score_generation'
  | 'recommendation_generation'
  | 'alert_dispatch'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function authorized(req: Request): boolean {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return false
  const token = auth.slice('Bearer '.length)
  return token === serviceRoleKey || (!!internalToken && token === internalToken)
}

async function runJob(supabase: ReturnType<typeof createClient>, jobType: JobType, payload: Record<string, unknown>) {
  switch (jobType) {
    case 'snapshot_generation': {
      const snapshotDate = (payload.snapshot_date as string | undefined) ?? new Date().toISOString().slice(0, 10)
      const companyId = (payload.company_id as string | undefined) ?? 'test-company-1'
      const { error } = await supabase.from('insight_snapshots').upsert({
        snapshot_date: snapshotDate,
        company_id: companyId,
        metrics: { generated_by: 'processor-jobs', at: new Date().toISOString() },
      })
      if (error) throw error
      return { snapshot_date: snapshotDate }
    }
    case 'anomaly_detection': {
      const { data: merchants, error } = await supabase.from('merchant_profiles').select('id').limit(5)
      if (error) throw error
      const events = (merchants ?? []).map((m, idx) => ({
        id: `risk-auto-${Date.now()}-${idx}`,
        merchant_id: m.id,
        event_type: 'anomaly_detected',
        severity: 'medium',
        status: 'open',
        description: 'Automated anomaly detection result',
      }))
      if (events.length > 0) {
        const { error: insertError } = await supabase.from('risk_events').insert(events)
        if (insertError) throw insertError
      }
      return { events_created: events.length }
    }
    case 'score_generation': {
      const today = new Date().toISOString().slice(0, 10)
      const { data: merchants, error } = await supabase.from('merchant_profiles').select('id').limit(25)
      if (error) throw error

      const rows = (merchants ?? []).map((m) => ({
        merchant_id: m.id,
        score_date: today,
        risk_score: 65,
        reason: 'Automated baseline score',
      }))

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from('merchant_scores').upsert(rows)
        if (insertError) throw insertError
      }
      return { scores_upserted: rows.length }
    }
    case 'recommendation_generation': {
      const { data: merchants, error } = await supabase.from('merchant_profiles').select('id').limit(5)
      if (error) throw error
      const recs = (merchants ?? []).map((m, idx) => ({
        id: `rec-auto-${Date.now()}-${idx}`,
        merchant_id: m.id,
        recommendation_type: 'velocity_check',
        priority: 'medium',
        status: 'pending',
        description: 'Review recent velocity increase pattern',
      }))
      if (recs.length > 0) {
        const { error: recError } = await supabase.from('recommendations').insert(recs)
        if (recError) throw recError
      }
      return { recommendations_created: recs.length }
    }
    case 'alert_dispatch': {
      const severity = (payload.severity_filter as string | undefined) ?? 'high'
      const { data: events, error: eventError } = await supabase
        .from('risk_events')
        .select('id, merchant_id')
        .eq('severity', severity)
        .limit(10)
      if (eventError) throw eventError

      const { data: channels, error: channelError } = await supabase
        .from('alert_channels')
        .select('id')
        .eq('is_active', true)
        .limit(5)
      if (channelError) throw channelError

      const dispatches = (events ?? []).flatMap((event) =>
        (channels ?? []).map((channel, idx) => ({
          id: `dispatch-auto-${Date.now()}-${idx}`,
          risk_event_id: event.id,
          channel_id: channel.id,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })),
      )

      if (dispatches.length > 0) {
        const { error: dispatchError } = await supabase.from('alert_dispatches').insert(dispatches)
        if (dispatchError) throw dispatchError
      }
      return { dispatches_created: dispatches.length }
    }
  }
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!authorized(req)) return json({ error: 'Unauthorized' }, 401)

  try {
    const payload = (await req.json()) as Record<string, unknown>
    const jobType = payload.job_type as JobType | undefined

    if (!jobType) return json({ error: 'job_type is required' }, 400)

    const valid: JobType[] = [
      'snapshot_generation',
      'anomaly_detection',
      'score_generation',
      'recommendation_generation',
      'alert_dispatch',
    ]

    if (!valid.includes(jobType)) return json({ error: `Unsupported job_type: ${jobType}` }, 400)

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const result = await runJob(supabase, jobType, payload)

    return json({ success: true, job_type: jobType, result })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

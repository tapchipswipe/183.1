import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { validateScheduledJobPayload, type JobType } from './job-contract.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const internalToken = Deno.env.get('INTERNAL_JOB_TOKEN') ?? ''

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function assertAuthorized(req: Request): boolean {
  const internalHeaderToken = req.headers.get('x-internal-token') ?? ''
  if (internalToken.length > 0 && internalHeaderToken === internalToken) {
    return true
  }

  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return false

  const token = authHeader.slice('Bearer '.length)
  return token === serviceRoleKey || (internalToken.length > 0 && token === internalToken)
}

async function withRunLog<T>(
  supabase: ReturnType<typeof createClient>,
  jobType: JobType,
  fn: () => Promise<T>,
): Promise<{ result?: T; error?: string }> {
  const startedAt = Date.now()
  const { data: config } = await supabase
    .from('scheduled_job_config')
    .select('id')
    .eq('job_type', jobType)
    .eq('is_enabled', true)
    .limit(1)
    .maybeSingle()

  const { data: run } = await supabase
    .from('scheduled_job_runs')
    .insert({
      job_config_id: config?.id ?? null,
      status: 'running',
      metadata: { job_type: jobType },
    })
    .select('id')
    .single()

  try {
    const result = await fn()
    await supabase
      .from('scheduled_job_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startedAt,
      })
      .eq('id', run?.id)

    await supabase
      .from('scheduled_job_config')
      .update({
        last_run_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', config?.id)

    return { result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await supabase
      .from('scheduled_job_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startedAt,
        error_message: message,
      })
      .eq('id', run?.id)

    return { error: message }
  }
}

async function runDailyPipeline(supabase: ReturnType<typeof createClient>) {
  const invokeHeaders = internalToken.length > 0 ? { 'x-internal-token': internalToken } : undefined
  const jobs: Array<Record<string, unknown>> = [
    { job_type: 'snapshot_generation', snapshot_date: new Date().toISOString().slice(0, 10) },
    { job_type: 'anomaly_detection', window_hours: 24 },
    { job_type: 'score_generation' },
    { job_type: 'recommendation_generation' },
    { job_type: 'alert_dispatch', severity_filter: 'critical' },
  ]

  const stepResults: Array<{ job_type: string; status: 'ok' | 'skipped'; warning?: string }> = []

  for (const body of jobs) {
    const jobType = String(body.job_type ?? 'unknown')
    const { error } = await supabase.functions.invoke('processor-jobs', { body, headers: invokeHeaders })
    if (error) {
      stepResults.push({ job_type: jobType, status: 'skipped', warning: error.message })
      continue
    }
    stepResults.push({ job_type: jobType, status: 'ok' })
  }

  return { pipeline_steps: jobs.length, step_results: stepResults }
}

async function runAnomalyRefresh(supabase: ReturnType<typeof createClient>) {
  const invokeHeaders = internalToken.length > 0 ? { 'x-internal-token': internalToken } : undefined
  const { error } = await supabase.functions.invoke('processor-jobs', {
    body: { job_type: 'anomaly_detection', window_hours: 4 },
    headers: invokeHeaders,
  })

  if (error) throw new Error(error.message)
  return { refreshed: true }
}

async function runDeadLetterRetry(supabase: ReturnType<typeof createClient>) {
  const invokeHeaders = internalToken.length > 0 ? { 'x-internal-token': internalToken } : undefined
  const { data: failedJobs, error } = await supabase
    .from('ingestion_jobs')
    .select('id')
    .eq('status', 'failed')
    .lt('retry_count', 3)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) throw new Error(error.message)

  let retried = 0
  const waitMs = Number(Deno.env.get('DEAD_LETTER_RETRY_DELAY_MS') ?? '100')

  for (const job of failedJobs ?? []) {
    const { error: retryError } = await supabase.functions.invoke('ingestion-api', {
      body: { action: 'retry', job_id: job.id },
      headers: invokeHeaders,
    })

    if (!retryError) retried += 1
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }

  return { retried, considered: failedJobs?.length ?? 0 }
}

async function runRollupRefresh(supabase: ReturnType<typeof createClient>) {
  const { error } = await supabase.rpc('refresh_txn_daily_rollups')
  if (error) throw new Error(error.message)
  return { refreshed: true }
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!assertAuthorized(req)) return json({ error: 'Unauthorized' }, 401)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const validation = validateScheduledJobPayload(body)
  if (!validation.ok) {
    return json({ error: validation.error }, 400)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const outcome = await withRunLog(supabase, validation.jobType, async () => {
    switch (validation.jobType) {
      case 'daily_pipeline':
        return runDailyPipeline(supabase)
      case 'anomaly_refresh':
        return runAnomalyRefresh(supabase)
      case 'dead_letter_retry':
        return runDeadLetterRetry(supabase)
      case 'rollup_refresh':
        return runRollupRefresh(supabase)
    }
  })

  if (outcome.error) {
    return json({ success: false, job_type: validation.jobType, error: outcome.error }, 500)
  }

  return json({ success: true, job_type: validation.jobType, result: outcome.result })
})

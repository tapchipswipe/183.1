import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

type Action = 'sync' | 'backfill' | 'retry'

type IngestionPayload = {
  action: Action
  connection_id?: string
  provider?: string
  idempotency_key?: string
  job_id?: string
  start_date?: string
  end_date?: string
  page_size?: number
  cursor?: string
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const internalToken = Deno.env.get('INTERNAL_JOB_TOKEN')

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getAuthToken(req: Request): string | null {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  return auth.slice('Bearer '.length)
}

function authorize(req: Request): boolean {
  const internalHeaderToken = req.headers.get('x-internal-token') ?? ''
  if (internalToken.length > 0 && internalHeaderToken === internalToken) {
    return true
  }

  const token = getAuthToken(req)
  if (!token) return false
  if (token === serviceRoleKey) return true
  return !!internalToken && token === internalToken
}

async function createJob(
  supabase: ReturnType<typeof createClient>,
  payload: IngestionPayload,
): Promise<{ job_id: string; reused: boolean }> {
  const metadata = {
    start_date: payload.start_date,
    end_date: payload.end_date,
    page_size: payload.page_size,
    cursor: payload.cursor,
  }

  if (payload.idempotency_key && payload.provider) {
    const { data: existing } = await supabase
      .from('ingestion_jobs')
      .select('id')
      .eq('provider', payload.provider)
      .eq('idempotency_key', payload.idempotency_key)
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      return { job_id: existing.id, reused: true }
    }
  }

  const { data, error } = await supabase
    .from('ingestion_jobs')
    .insert({
      connection_id: payload.connection_id,
      provider: payload.provider,
      job_type: payload.action,
      status: 'processing',
      idempotency_key: payload.idempotency_key,
      metadata,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  return { job_id: data.id, reused: false }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  if (!authorize(req)) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const payload = (await req.json()) as IngestionPayload

    if (!payload.action) {
      return json({ error: 'action is required' }, 400)
    }

    if (payload.action === 'retry') {
      if (!payload.job_id) return json({ error: 'job_id is required for retry' }, 400)

      const { error } = await supabase
        .from('ingestion_jobs')
        .update({
          status: 'processing',
          retry_count: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.job_id)

      if (error) throw new Error(error.message)
      return json({ status: 'processing', job_id: payload.job_id })
    }

    if (!payload.connection_id || !payload.provider) {
      return json({ error: 'connection_id and provider are required' }, 400)
    }

    const { job_id, reused } = await createJob(supabase, payload)

    if (payload.action === 'backfill') {
      return json({
        status: 'processing',
        job_id,
        has_more: !!payload.cursor,
        next_cursor: payload.cursor ? null : 'cursor_next_demo',
        window: {
          start_date: payload.start_date,
          end_date: payload.end_date,
        },
        message: reused ? 'Reusing existing job for idempotency key' : 'Backfill started',
      })
    }

    return json({
      status: 'processing',
      job_id,
      message: reused ? 'Reusing existing job for idempotency key' : 'Sync started',
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

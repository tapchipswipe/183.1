import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const scopeMap = {
  '/metrics': 'metrics:read',
  '/risk': 'risk:read',
  '/merchants': 'merchant:read',
  '/recommendations': 'recommendations:read',
} as const

type Scope = (typeof scopeMap)[keyof typeof scopeMap]

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function authorize(req: Request, required: Scope) {
  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return { ok: false as const, status: 401 }

  const token = authHeader.slice('Bearer '.length)
  const tokenHash = await sha256(token)
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await supabase
    .from('service_api_tokens')
    .select('id, company_id, scopes, is_active')
    .eq('token_hash', tokenHash)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error || !data) return { ok: false as const, status: 401 }
  if (!Array.isArray(data.scopes) || !data.scopes.includes(required)) {
    return { ok: false as const, status: 403 }
  }

  return { ok: true as const, companyId: data.company_id }
}

serve(async (req) => {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const path = new URL(req.url).pathname.replace('/functions/v1/insights-api', '') || '/metrics'
  const requiredScope = scopeMap[path as keyof typeof scopeMap]

  if (!requiredScope) return json({ error: 'Unknown endpoint' }, 404)

  const auth = await authorize(req, requiredScope)
  if (!auth.ok) {
    return json({ error: auth.status === 403 ? 'Forbidden' : 'Unauthorized' }, auth.status)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  if (path === '/metrics') {
    const { data, error } = await supabase
      .from('insight_snapshots')
      .select('snapshot_date, metrics')
      .eq('company_id', auth.companyId)
      .order('snapshot_date', { ascending: false })
      .limit(30)
    if (error) return json({ error: error.message }, 500)
    return json({ items: data })
  }

  if (path === '/risk') {
    const { data, error } = await supabase
      .from('risk_events')
      .select('id, severity, status, description, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return json({ error: error.message }, 500)
    return json({ items: data })
  }

  if (path === '/merchants') {
    const { data, error } = await supabase
      .from('merchant_profiles')
      .select('id, business_name, industry, risk_tier')
      .eq('company_id', auth.companyId)
      .limit(100)
    if (error) return json({ error: error.message }, 500)
    return json({ items: data })
  }

  const { data, error } = await supabase
    .from('recommendations')
    .select('id, recommendation_type, priority, status, description, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return json({ error: error.message }, 500)
  return json({ items: data })
})

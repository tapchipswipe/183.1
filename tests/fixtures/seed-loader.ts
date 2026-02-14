import { createClient } from '@supabase/supabase-js'

const TEST_COMPANY_ID = 'test-company-1'

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required for integration tests')
  }

  return createClient(supabaseUrl, supabaseKey)
}

export async function loadSeedData() {
  const supabase = getSupabase()

  await supabase.from('companies').upsert([
    { id: 'test-company-1', company_name: 'Test Payment Processor Inc', industry: 'payment_processing' },
    { id: 'test-company-2', company_name: 'Demo Financial Services', industry: 'financial_services' },
  ])

  await supabase.from('user_roles').upsert([
    { user_id: 'test-user-analyst-1', company_id: TEST_COMPANY_ID, role: 'analyst' },
    { user_id: 'test-user-manager-1', company_id: TEST_COMPANY_ID, role: 'manager' },
    { user_id: 'test-user-admin-1', company_id: TEST_COMPANY_ID, role: 'admin' },
  ])

  await supabase.from('processor_connections').upsert([
    {
      id: 'conn-stripe-1',
      company_id: TEST_COMPANY_ID,
      provider: 'stripe',
      account_id: 'acct_test_stripe_001',
      status: 'active',
      credentials_encrypted: { api_key: 'sk_test_encrypted' },
    },
  ])

  await supabase.from('merchant_profiles').upsert([
    {
      id: 'merchant-001',
      company_id: TEST_COMPANY_ID,
      external_merchant_id: 'ext_merchant_001',
      business_name: 'Clean Merchant LLC',
      industry: 'retail',
      risk_tier: 'low',
    },
    {
      id: 'merchant-002',
      company_id: TEST_COMPANY_ID,
      external_merchant_id: 'ext_merchant_002',
      business_name: 'High Volume Store',
      industry: 'ecommerce',
      risk_tier: 'medium',
    },
  ])

  await supabase.from('normalized_transactions').upsert([
    {
      merchant_id: 'merchant-001',
      txn_date: '2026-02-01',
      txn_amount: 150,
      txn_status: 'completed',
      processor: 'stripe',
      processor_txn_id: 'ch_test_001',
    },
    {
      merchant_id: 'merchant-002',
      txn_date: '2026-02-03',
      txn_amount: 15000,
      txn_status: 'completed',
      processor: 'square',
      processor_txn_id: 'sq_test_003',
    },
  ])

  await supabase.from('risk_events').upsert([
    {
      id: 'risk-001',
      merchant_id: 'merchant-002',
      event_type: 'volume_spike',
      severity: 'high',
      status: 'open',
      description: 'Unusual transaction volume detected',
    },
  ])

  await supabase.from('recommendations').upsert([
    {
      id: 'rec-001',
      merchant_id: 'merchant-002',
      recommendation_type: 'velocity_check',
      priority: 'high',
      status: 'pending',
      description: 'Implement velocity limits for large transactions',
    },
  ])

  await supabase.from('insight_snapshots').upsert([
    {
      snapshot_date: '2026-02-13',
      company_id: TEST_COMPANY_ID,
      metrics: { total_volume: 45000, transaction_count: 150, avg_ticket_size: 300 },
    },
  ])

  await supabase.from('alert_channels').upsert([
    {
      id: 'alert-ch-001',
      company_id: TEST_COMPANY_ID,
      channel_type: 'email',
      destination: 'alerts@test-company.com',
      is_active: true,
    },
  ])

  await supabase.from('service_api_tokens').upsert([
    {
      id: 'token-001',
      company_id: TEST_COMPANY_ID,
      token_name: 'Test Full Access',
      token_hash: 'hash_full_access_token',
      scopes: ['metrics:read', 'risk:read', 'merchant:read', 'recommendations:read'],
      is_active: true,
    },
  ])
}

export async function cleanupSeedData() {
  const supabase = getSupabase()

  await supabase.from('alert_dispatches').delete().ilike('id', 'dispatch-auto-%')
  await supabase.from('recommendation_feedback').delete().in('recommendation_id', ['rec-001'])
  await supabase.from('risk_case_notes').delete().in('risk_event_id', ['risk-001'])
  await supabase.from('recommendations').delete().in('id', ['rec-001'])
  await supabase.from('risk_events').delete().in('id', ['risk-001'])
  await supabase.from('insight_snapshots').delete().eq('company_id', TEST_COMPANY_ID)
  await supabase.from('merchant_scores').delete().in('merchant_id', ['merchant-001', 'merchant-002'])
  await supabase.from('normalized_transactions').delete().in('processor_txn_id', ['ch_test_001', 'sq_test_003'])
  await supabase.from('merchant_profiles').delete().in('id', ['merchant-001', 'merchant-002'])
  await supabase.from('ingestion_jobs').delete().eq('provider', 'stripe')
  await supabase.from('processor_connections').delete().in('id', ['conn-stripe-1'])
  await supabase.from('service_api_tokens').delete().in('id', ['token-001'])
  await supabase.from('alert_channels').delete().in('id', ['alert-ch-001'])
  await supabase.from('user_roles').delete().eq('company_id', TEST_COMPANY_ID)
  await supabase.from('companies').delete().in('id', ['test-company-1', 'test-company-2'])
}

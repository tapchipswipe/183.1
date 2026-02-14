insert into companies (id, company_name, industry)
values
  ('test-company-1', 'Test Payment Processor Inc', 'payment_processing'),
  ('test-company-2', 'Demo Financial Services', 'financial_services')
on conflict (id) do nothing;

insert into user_roles (user_id, company_id, role)
values
  ('test-user-analyst-1', 'test-company-1', 'analyst'),
  ('test-user-manager-1', 'test-company-1', 'manager'),
  ('test-user-admin-1', 'test-company-1', 'admin')
on conflict (user_id, company_id) do nothing;

insert into processor_connections (id, company_id, provider, account_id, status, credentials_encrypted)
values
  ('conn-stripe-1', 'test-company-1', 'stripe', 'acct_test_stripe_001', 'active', '{"api_key":"sk_test_encrypted"}'::jsonb),
  ('conn-square-1', 'test-company-1', 'square', 'sq_test_001', 'active', '{"access_token":"sq_test_token"}'::jsonb),
  ('conn-authnet-1', 'test-company-1', 'authorize_net', 'authnet_test_001', 'active', '{"api_login":"test_login","transaction_key":"test_key"}'::jsonb)
on conflict (id) do nothing;

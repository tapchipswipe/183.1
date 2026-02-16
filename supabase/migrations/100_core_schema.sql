-- One82 Phase 1 schema: merchants + statement ingestion + transactions.

create extension if not exists pgcrypto;

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique,
  business_name text not null,
  store_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_merchants_owner_user_id on public.merchants(owner_user_id);

create table if not exists public.merchant_statements (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  file_name text,
  file_type text,
  extracted_json jsonb not null default '{}'::jsonb,
  currency text not null default 'USD',
  total_volume numeric(12,2) not null default 0,
  total_fees numeric(12,2),
  confidence numeric(5,4),
  created_at timestamptz not null default now()
);

create index if not exists idx_statements_merchant_created on public.merchant_statements(merchant_id, created_at desc);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  statement_id uuid references public.merchant_statements(id) on delete set null,
  occurred_at timestamptz not null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  description text,
  product_name text,
  source text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_merchant_time on public.transactions(merchant_id, occurred_at desc);
create index if not exists idx_transactions_statement on public.transactions(statement_id);

alter table public.merchants enable row level security;
alter table public.merchant_statements enable row level security;
alter table public.transactions enable row level security;

create policy if not exists merchants_owner_all on public.merchants
  for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create policy if not exists statements_owner_all on public.merchant_statements
  for all
  using (exists (select 1 from public.merchants m where m.id = merchant_statements.merchant_id and m.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.merchants m where m.id = merchant_statements.merchant_id and m.owner_user_id = auth.uid()));

create policy if not exists transactions_owner_all on public.transactions
  for all
  using (exists (select 1 from public.merchants m where m.id = transactions.merchant_id and m.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.merchants m where m.id = transactions.merchant_id and m.owner_user_id = auth.uid()));


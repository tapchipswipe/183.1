-- ONE82 core schema (Phase 1)
-- This migration is written to be additive and schema-tolerant.

create extension if not exists pgcrypto;

-- Profiles (optional, used by frontend)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Merchants (business workspaces)
create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  business_name text not null,
  industry text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_merchants_owner_user_id on public.merchants(owner_user_id);

-- Processor connections
create table if not exists public.processor_connections (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'square', 'authorizenet')),
  account_id text,
  account_id_norm text generated always as (coalesce(account_id, '')) stored,
  status text not null default 'active' check (status in ('active', 'inactive', 'error')),
  credentials_encrypted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, provider, account_id_norm)
);

create index if not exists idx_processor_connections_merchant on public.processor_connections(merchant_id);
create index if not exists idx_processor_connections_provider_account on public.processor_connections(provider, account_id);

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  sku text,
  price numeric(12,2),
  unit_cost numeric(12,2),
  current_quantity integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, name)
);

create index if not exists idx_products_merchant on public.products(merchant_id);

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  processor_connection_id uuid references public.processor_connections(id) on delete set null,
  processor text not null,
  external_transaction_id text not null,
  occurred_at timestamptz not null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status text,
  description text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, processor, external_transaction_id)
);

create index if not exists idx_transactions_merchant_time on public.transactions(merchant_id, occurred_at desc);
create index if not exists idx_transactions_ext on public.transactions(processor, external_transaction_id);

-- Line items
create table if not exists public.transaction_line_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  external_product_id text,
  name text,
  quantity numeric(12,3) not null default 1,
  unit_price numeric(12,2),
  line_total numeric(12,2),
  created_at timestamptz not null default now()
);

create index if not exists idx_line_items_tx on public.transaction_line_items(transaction_id);

-- Inventory snapshots
create table if not exists public.inventory_snapshots (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  snapshot_date date not null,
  quantity integer,
  created_at timestamptz not null default now(),
  unique (merchant_id, product_id, snapshot_date)
);

create index if not exists idx_inventory_snapshots_merchant_date on public.inventory_snapshots(merchant_id, snapshot_date desc);

-- Insights
create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  insight_type text not null,
  title text not null,
  body text,
  severity text,
  window_start date,
  window_end date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_insights_merchant_created on public.insights(merchant_id, created_at desc);

-- Recommendations
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  recommendation_type text not null,
  priority text not null default 'medium',
  status text not null default 'pending',
  title text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recommendations_merchant_created on public.recommendations(merchant_id, created_at desc);

-- Recommendation feedback
create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  action_taken text,
  outcome text,
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists idx_recommendation_feedback_rec on public.recommendation_feedback(recommendation_id, created_at desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.merchants enable row level security;
alter table public.processor_connections enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_line_items enable row level security;
alter table public.inventory_snapshots enable row level security;
alter table public.insights enable row level security;
alter table public.recommendations enable row level security;
alter table public.recommendation_feedback enable row level security;

-- Simple single-owner policies
create policy if not exists profiles_owner_select on public.profiles
  for select using (auth.uid() = user_id);
create policy if not exists profiles_owner_update on public.profiles
  for update using (auth.uid() = user_id);

create policy if not exists merchants_owner_select on public.merchants
  for select using (auth.uid() = owner_user_id);
create policy if not exists merchants_owner_update on public.merchants
  for update using (auth.uid() = owner_user_id);

create policy if not exists processor_connections_owner_all on public.processor_connections
  for all using (
    exists (select 1 from public.merchants m where m.id = processor_connections.merchant_id and m.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.merchants m where m.id = processor_connections.merchant_id and m.owner_user_id = auth.uid())
  );

create policy if not exists products_owner_all on public.products
  for all using (
    exists (select 1 from public.merchants m where m.id = products.merchant_id and m.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.merchants m where m.id = products.merchant_id and m.owner_user_id = auth.uid())
  );

create policy if not exists transactions_owner_all on public.transactions
  for all using (
    exists (select 1 from public.merchants m where m.id = transactions.merchant_id and m.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.merchants m where m.id = transactions.merchant_id and m.owner_user_id = auth.uid())
  );

create policy if not exists line_items_owner_all on public.transaction_line_items
  for all using (
    exists (
      select 1
      from public.transactions t
      join public.merchants m on m.id = t.merchant_id
      where t.id = transaction_line_items.transaction_id and m.owner_user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.transactions t
      join public.merchants m on m.id = t.merchant_id
      where t.id = transaction_line_items.transaction_id and m.owner_user_id = auth.uid()
    )
  );

create policy if not exists inventory_owner_all on public.inventory_snapshots
  for all using (
    exists (select 1 from public.merchants m where m.id = inventory_snapshots.merchant_id and m.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.merchants m where m.id = inventory_snapshots.merchant_id and m.owner_user_id = auth.uid())
  );

create policy if not exists insights_owner_all on public.insights
  for all using (
    exists (select 1 from public.merchants m where m.id = insights.merchant_id and m.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.merchants m where m.id = insights.merchant_id and m.owner_user_id = auth.uid())
  );

create policy if not exists recommendations_owner_all on public.recommendations
  for all using (
    exists (select 1 from public.merchants m where m.id = recommendations.merchant_id and m.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.merchants m where m.id = recommendations.merchant_id and m.owner_user_id = auth.uid())
  );

create policy if not exists feedback_owner_all on public.recommendation_feedback
  for all using (
    exists (select 1 from public.merchants m where m.id = recommendation_feedback.merchant_id and m.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.merchants m where m.id = recommendation_feedback.merchant_id and m.owner_user_id = auth.uid())
  );

-- Trigger: create profile + merchant on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();

  insert into public.merchants (owner_user_id, business_name, industry)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'company_name', ''), 'My Business'),
    nullif(new.raw_user_meta_data->>'store_type', '')
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


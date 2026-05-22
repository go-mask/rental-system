-- 房租收入管理系統 Supabase schema
-- 使用方式：在 Supabase Dashboard > SQL Editor 全部貼上並執行。

create extension if not exists pgcrypto;

create table if not exists public.app_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rent_year integer not null default extract(year from now())::integer check (rent_year between 1900 and 2200),
  sort_order integer not null default 0,
  address text not null,
  tenant_name text,
  rent_amount integer not null default 0,
  payment_cycle text,
  bank_account_last5 text,
  notes text,
  electric_previous numeric(12, 2) not null default 0,
  electric_current numeric(12, 2) not null default 0,
  water_previous numeric(12, 2) not null default 0,
  water_current numeric(12, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  rent_year integer not null check (rent_year between 1900 and 2200),
  rent_month integer not null check (rent_month between 1 and 12),
  payment_text text not null default '',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, property_id, rent_year, rent_month)
);

create table if not exists public.remittance_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bank_name text not null default '',
  account_number text not null default '',
  payee_name text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.utility_periods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  address text not null,
  period_year integer not null check (period_year between 1900 and 2200),
  period_month integer not null check (period_month between 1 and 12),
  period_label text,
  official_electric_total integer not null default 0,
  official_water_total integer not null default 0,
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.utility_readings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  utility_period_id uuid not null references public.utility_periods(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  unit_label text not null default '',
  tenant_name text not null default '',
  rent_amount integer not null default 0,
  other_amount integer not null default 0,
  electric_previous numeric(12, 2) not null default 0,
  electric_current numeric(12, 2) not null default 0,
  electric_usage numeric(12, 2) not null default 0,
  electric_fee integer not null default 0,
  water_previous numeric(12, 2) not null default 0,
  water_current numeric(12, 2) not null default 0,
  water_usage numeric(12, 2) not null default 0,
  water_fee integer not null default 0,
  total_due integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_bills (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bill_type text not null check (bill_type in ('simple', 'shared')),
  address text not null default '',
  bill_year integer not null check (bill_year between 1900 and 2200),
  bill_month integer not null check (bill_month between 1 and 12),
  due_date date,
  utility_period_id uuid references public.utility_periods(id) on delete set null,
  remittance_profile_id uuid references public.remittance_profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_bill_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tenant_bill_id uuid not null references public.tenant_bills(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  unit_label text not null default '',
  tenant_name text not null default '',
  rent_amount integer not null default 0,
  electric_fee integer not null default 0,
  water_fee integer not null default 0,
  other_amount integer not null default 0,
  total_due integer not null default 0,
  meter_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settlement_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  address text not null default '',
  tenant_name text not null default '',
  move_out_date date,
  calculation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists properties_owner_sort_idx on public.properties(owner_id, sort_order, created_at);
create index if not exists rent_payments_owner_year_month_idx on public.rent_payments(owner_id, rent_year, rent_month);
create index if not exists utility_periods_owner_period_idx on public.utility_periods(owner_id, period_year, period_month);
create index if not exists tenant_bills_owner_period_idx on public.tenant_bills(owner_id, bill_year, bill_month);

alter table public.app_profiles enable row level security;
alter table public.properties enable row level security;
alter table public.rent_payments enable row level security;
alter table public.remittance_profiles enable row level security;
alter table public.utility_periods enable row level security;
alter table public.utility_readings enable row level security;
alter table public.tenant_bills enable row level security;
alter table public.tenant_bill_items enable row level security;
alter table public.settlement_records enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.app_profiles to authenticated;
grant select, insert, update, delete on public.properties to authenticated;
grant select, insert, update, delete on public.rent_payments to authenticated;
grant select, insert, update, delete on public.remittance_profiles to authenticated;
grant select, insert, update, delete on public.utility_periods to authenticated;
grant select, insert, update, delete on public.utility_readings to authenticated;
grant select, insert, update, delete on public.tenant_bills to authenticated;
grant select, insert, update, delete on public.tenant_bill_items to authenticated;
grant select, insert, update, delete on public.settlement_records to authenticated;

drop policy if exists "profiles are owned by user" on public.app_profiles;
create policy "profiles are owned by user" on public.app_profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "properties are owned by user" on public.properties;
create policy "properties are owned by user" on public.properties
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "rent payments are owned by user" on public.rent_payments;
create policy "rent payments are owned by user" on public.rent_payments
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "remittance profiles are owned by user" on public.remittance_profiles;
create policy "remittance profiles are owned by user" on public.remittance_profiles
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "utility periods are owned by user" on public.utility_periods;
create policy "utility periods are owned by user" on public.utility_periods
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "utility readings are owned by user" on public.utility_readings;
create policy "utility readings are owned by user" on public.utility_readings
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "tenant bills are owned by user" on public.tenant_bills;
create policy "tenant bills are owned by user" on public.tenant_bills
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "tenant bill items are owned by user" on public.tenant_bill_items;
create policy "tenant bill items are owned by user" on public.tenant_bill_items
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "settlement records are owned by user" on public.settlement_records;
create policy "settlement records are owned by user" on public.settlement_records
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

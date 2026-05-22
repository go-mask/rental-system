-- 多人協作 migration：組織、成員、邀請與 organization_id 權限
-- 在 Supabase SQL Editor 執行。若中途失敗，請把錯誤訊息貼回來，不要反覆重跑。

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '房租管理',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor', 'viewer')),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

alter table public.properties add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.rent_payments add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.remittance_profiles add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.utility_periods add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.utility_readings add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.tenant_bills add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.tenant_bill_items add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.settlement_records add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

insert into public.organizations (owner_id, name)
select distinct owner_id, '房租管理'
from public.properties
where owner_id is not null
  and not exists (
    select 1 from public.organizations org where org.owner_id = properties.owner_id
  );

insert into public.organization_members (organization_id, user_id, role)
select org.id, org.owner_id, 'owner'
from public.organizations org
on conflict (organization_id, user_id) do nothing;

update public.properties p
set organization_id = org.id
from public.organizations org
where p.organization_id is null and p.owner_id = org.owner_id;

update public.rent_payments p
set organization_id = org.id
from public.organizations org
where p.organization_id is null and p.owner_id = org.owner_id;

update public.remittance_profiles p
set organization_id = org.id
from public.organizations org
where p.organization_id is null and p.owner_id = org.owner_id;

update public.utility_periods p
set organization_id = org.id
from public.organizations org
where p.organization_id is null and p.owner_id = org.owner_id;

update public.utility_readings p
set organization_id = org.id
from public.organizations org
where p.organization_id is null and p.owner_id = org.owner_id;

update public.tenant_bills p
set organization_id = org.id
from public.organizations org
where p.organization_id is null and p.owner_id = org.owner_id;

update public.tenant_bill_items p
set organization_id = org.id
from public.organizations org
where p.organization_id is null and p.owner_id = org.owner_id;

update public.settlement_records p
set organization_id = org.id
from public.organizations org
where p.organization_id is null and p.owner_id = org.owner_id;

create index if not exists organization_members_user_idx on public.organization_members(user_id, organization_id);
create index if not exists organization_invitations_email_idx on public.organization_invitations(lower(email), accepted_at);
create index if not exists properties_org_year_sort_idx on public.properties(organization_id, rent_year, sort_order, created_at);
create index if not exists rent_payments_org_year_month_idx on public.rent_payments(organization_id, rent_year, rent_month);
create unique index if not exists rent_payments_org_property_period_unique
on public.rent_payments(organization_id, property_id, rent_year, rent_month);
create index if not exists remittance_profiles_org_idx on public.remittance_profiles(organization_id, created_at);
create index if not exists utility_periods_org_period_idx on public.utility_periods(organization_id, period_year, period_month);
create index if not exists tenant_bills_org_period_idx on public.tenant_bills(organization_id, bill_year, bill_month);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;

grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.organization_invitations to authenticated;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members member
    where member.organization_id = target_org
      and member.user_id = auth.uid()
  );
$$;

create or replace function public.org_role(target_org uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select member.role
  from public.organization_members member
  where member.organization_id = target_org
    and member.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_edit_org(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.org_role(target_org) in ('owner', 'editor'), false);
$$;

create or replace function public.can_manage_org(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.org_role(target_org) = 'owner', false);
$$;

create or replace function public.ensure_default_organization()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
begin
  select organization_id into org_id
  from public.organization_members
  where user_id = auth.uid()
  order by created_at
  limit 1;

  if org_id is not null then
    return org_id;
  end if;

  insert into public.organizations (owner_id, name)
  values (auth.uid(), '房租管理')
  returning id into org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, auth.uid(), 'owner');

  return org_id;
end;
$$;

create or replace function public.accept_pending_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted_count integer := 0;
  invite record;
  user_email text;
begin
  user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if user_email = '' then
    return 0;
  end if;

  for invite in
    select *
    from public.organization_invitations
    where lower(email) = user_email
      and accepted_at is null
  loop
    insert into public.organization_members (organization_id, user_id, role)
    values (invite.organization_id, auth.uid(), invite.role)
    on conflict (organization_id, user_id) do update set role = excluded.role;

    update public.organization_invitations
    set accepted_at = now()
    where id = invite.id;

    accepted_count := accepted_count + 1;
  end loop;

  return accepted_count;
end;
$$;

drop policy if exists "organizations readable by members" on public.organizations;
create policy "organizations readable by members" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

drop policy if exists "organizations insert self owner" on public.organizations;
create policy "organizations insert self owner" on public.organizations
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "organizations manageable by owner" on public.organizations;
create policy "organizations manageable by owner" on public.organizations
  for update to authenticated
  using (public.can_manage_org(id))
  with check (public.can_manage_org(id));

drop policy if exists "members readable by org members" on public.organization_members;
create policy "members readable by org members" on public.organization_members
  for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "members manageable by owner" on public.organization_members;
create policy "members manageable by owner" on public.organization_members
  for all to authenticated
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

drop policy if exists "invitations readable by org owner or invitee" on public.organization_invitations;
create policy "invitations readable by org owner or invitee" on public.organization_invitations
  for select to authenticated
  using (public.can_manage_org(organization_id) or lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "invitations manageable by owner" on public.organization_invitations;
create policy "invitations manageable by owner" on public.organization_invitations
  for all to authenticated
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

drop policy if exists "properties are owned by user" on public.properties;
create policy "properties readable by org members" on public.properties
  for select to authenticated using (public.is_org_member(organization_id));
create policy "properties editable by org editors" on public.properties
  for insert to authenticated with check (public.can_edit_org(organization_id));
create policy "properties updatable by org editors" on public.properties
  for update to authenticated using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id));
create policy "properties deletable by org editors" on public.properties
  for delete to authenticated using (public.can_edit_org(organization_id));

drop policy if exists "rent payments are owned by user" on public.rent_payments;
create policy "rent payments readable by org members" on public.rent_payments
  for select to authenticated using (public.is_org_member(organization_id));
create policy "rent payments editable by org editors" on public.rent_payments
  for insert to authenticated with check (public.can_edit_org(organization_id));
create policy "rent payments updatable by org editors" on public.rent_payments
  for update to authenticated using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id));
create policy "rent payments deletable by org editors" on public.rent_payments
  for delete to authenticated using (public.can_edit_org(organization_id));

drop policy if exists "remittance profiles are owned by user" on public.remittance_profiles;
create policy "remittance profiles readable by org members" on public.remittance_profiles
  for select to authenticated using (public.is_org_member(organization_id));
create policy "remittance profiles editable by org editors" on public.remittance_profiles
  for insert to authenticated with check (public.can_edit_org(organization_id));
create policy "remittance profiles updatable by org editors" on public.remittance_profiles
  for update to authenticated using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id));
create policy "remittance profiles deletable by org editors" on public.remittance_profiles
  for delete to authenticated using (public.can_edit_org(organization_id));

drop policy if exists "utility periods are owned by user" on public.utility_periods;
create policy "utility periods readable by org members" on public.utility_periods
  for select to authenticated using (public.is_org_member(organization_id));
create policy "utility periods editable by org editors" on public.utility_periods
  for insert to authenticated with check (public.can_edit_org(organization_id));
create policy "utility periods updatable by org editors" on public.utility_periods
  for update to authenticated using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id));
create policy "utility periods deletable by org editors" on public.utility_periods
  for delete to authenticated using (public.can_edit_org(organization_id));

drop policy if exists "utility readings are owned by user" on public.utility_readings;
create policy "utility readings readable by org members" on public.utility_readings
  for select to authenticated using (public.is_org_member(organization_id));
create policy "utility readings editable by org editors" on public.utility_readings
  for insert to authenticated with check (public.can_edit_org(organization_id));
create policy "utility readings updatable by org editors" on public.utility_readings
  for update to authenticated using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id));
create policy "utility readings deletable by org editors" on public.utility_readings
  for delete to authenticated using (public.can_edit_org(organization_id));

drop policy if exists "tenant bills are owned by user" on public.tenant_bills;
create policy "tenant bills readable by org members" on public.tenant_bills
  for select to authenticated using (public.is_org_member(organization_id));
create policy "tenant bills editable by org editors" on public.tenant_bills
  for insert to authenticated with check (public.can_edit_org(organization_id));
create policy "tenant bills updatable by org editors" on public.tenant_bills
  for update to authenticated using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id));
create policy "tenant bills deletable by org editors" on public.tenant_bills
  for delete to authenticated using (public.can_edit_org(organization_id));

drop policy if exists "tenant bill items are owned by user" on public.tenant_bill_items;
create policy "tenant bill items readable by org members" on public.tenant_bill_items
  for select to authenticated using (public.is_org_member(organization_id));
create policy "tenant bill items editable by org editors" on public.tenant_bill_items
  for insert to authenticated with check (public.can_edit_org(organization_id));
create policy "tenant bill items updatable by org editors" on public.tenant_bill_items
  for update to authenticated using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id));
create policy "tenant bill items deletable by org editors" on public.tenant_bill_items
  for delete to authenticated using (public.can_edit_org(organization_id));

drop policy if exists "settlement records are owned by user" on public.settlement_records;
create policy "settlement records readable by org members" on public.settlement_records
  for select to authenticated using (public.is_org_member(organization_id));
create policy "settlement records editable by org editors" on public.settlement_records
  for insert to authenticated with check (public.can_edit_org(organization_id));
create policy "settlement records updatable by org editors" on public.settlement_records
  for update to authenticated using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id));
create policy "settlement records deletable by org editors" on public.settlement_records
  for delete to authenticated using (public.can_edit_org(organization_id));

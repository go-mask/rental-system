-- 已經執行過 supabase-schema.sql 的專案，請再執行這份 migration。
-- 新專案若直接執行最新版 supabase-schema.sql，則不需要重複執行。

alter table public.properties
add column if not exists rent_year integer not null default extract(year from now())::integer
check (rent_year between 1900 and 2200);

create index if not exists properties_owner_year_sort_idx
on public.properties(owner_id, rent_year, sort_order, created_at);

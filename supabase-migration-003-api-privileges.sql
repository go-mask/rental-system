-- 配合 Supabase 2026 Data API 權限變更：明確宣告本系統需要的 API 權限。
-- 已經執行過前兩份 migration 的專案，請再執行這份 migration。
-- 這份 migration 可重複執行；它不會放寬到 anon 讀寫資料表。

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
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.organization_invitations to authenticated;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.org_role(uuid) to authenticated;
grant execute on function public.can_edit_org(uuid) to authenticated;
grant execute on function public.can_manage_org(uuid) to authenticated;
grant execute on function public.ensure_default_organization() to authenticated;
grant execute on function public.accept_pending_invitations() to authenticated;

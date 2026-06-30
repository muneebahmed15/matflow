-- Split coach vs admin RLS on billing and admin tables.
-- Coaches retain read access to plans (for context) but cannot mutate admin data.

-- plans: staff read, admin write
drop policy if exists "plans_staff_all" on public.plans;
create policy "plans_staff_select" on public.plans
  for select using (public.is_gym_staff(gym_id));
create policy "plans_admin_insert" on public.plans
  for insert with check (public.is_gym_admin(gym_id));
create policy "plans_admin_update" on public.plans
  for update using (public.is_gym_admin(gym_id));
create policy "plans_admin_delete" on public.plans
  for delete using (public.is_gym_admin(gym_id));

-- subscriptions, leads, families, notifications, refunds: admin only
drop policy if exists "subscriptions_staff_all" on public.subscriptions;
create policy "subscriptions_admin_all" on public.subscriptions
  for all using (public.is_gym_admin(gym_id))
  with check (public.is_gym_admin(gym_id));

drop policy if exists "leads_staff_all" on public.leads;
create policy "leads_admin_all" on public.leads
  for all using (public.is_gym_admin(gym_id))
  with check (public.is_gym_admin(gym_id));

drop policy if exists "families_staff_all" on public.families;
create policy "families_admin_all" on public.families
  for all using (public.is_gym_admin(gym_id))
  with check (public.is_gym_admin(gym_id));

drop policy if exists "notifications_staff_all" on public.notifications;
create policy "notifications_admin_all" on public.notifications
  for all using (public.is_gym_admin(gym_id))
  with check (public.is_gym_admin(gym_id));

drop policy if exists "refunds_staff_all" on public.refunds;
create policy "refunds_admin_all" on public.refunds
  for all using (public.is_gym_admin(gym_id))
  with check (public.is_gym_admin(gym_id));

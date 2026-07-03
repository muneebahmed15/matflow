-- Harden helper RPCs: internal to RLS policies, not callable by anon from the client API.
-- stripe_webhook_events intentionally has RLS with no policies (service-role only).

revoke all on function public.is_gym_owner(uuid) from public, anon;
revoke all on function public.is_gym_staff(uuid) from public, anon;
revoke all on function public.is_gym_admin(uuid) from public, anon;
revoke all on function public.is_gym_supervisor(uuid) from public, anon;
revoke all on function public.current_member_id() from public, anon;
revoke all on function public.accessible_member_ids() from public, anon;
revoke all on function public.can_access_member(uuid) from public, anon;

grant execute on function public.is_gym_owner(uuid) to authenticated, service_role;
grant execute on function public.is_gym_staff(uuid) to authenticated, service_role;
grant execute on function public.is_gym_admin(uuid) to authenticated, service_role;
grant execute on function public.is_gym_supervisor(uuid) to authenticated, service_role;
grant execute on function public.current_member_id() to authenticated, service_role;
grant execute on function public.accessible_member_ids() to authenticated, service_role;
grant execute on function public.can_access_member(uuid) to authenticated, service_role;

-- Explicit deny for client roles on webhook ledger (service role bypasses RLS).
drop policy if exists "stripe_webhook_events_deny_all" on public.stripe_webhook_events;
create policy "stripe_webhook_events_deny_all"
  on public.stripe_webhook_events
  for all
  to authenticated, anon
  using (false)
  with check (false);

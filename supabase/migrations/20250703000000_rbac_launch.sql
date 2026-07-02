-- RBAC launch: portal family access, supervisor role, instructor class scope

-- Portal member personas
alter table public.members
  add column if not exists portal_role text not null default 'primary';

alter table public.members
  drop constraint if exists members_portal_role_check;

alter table public.members
  add constraint members_portal_role_check
  check (portal_role in ('primary', 'dependent'));

-- Staff: add supervisor role
alter table public.staff_roles
  drop constraint if exists staff_roles_role_check;

alter table public.staff_roles
  add constraint staff_roles_role_check
  check (role in ('admin', 'supervisor', 'coach'));

-- Instructor class assignment
alter table public.classes
  add column if not exists instructor_staff_id uuid references public.staff_roles(id) on delete set null;

create index if not exists idx_classes_instructor_staff on public.classes(instructor_staff_id);

-- Supervisor helper (between coach and admin)
create or replace function public.is_gym_supervisor(gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_gym_admin(gym_id)
    or exists (
      select 1 from public.staff_roles sr
      where sr.gym_id = gym_id
        and sr.user_id = auth.uid()
        and sr.role = 'supervisor'
    );
$$;

-- Family-aware portal member access
create or replace function public.accessible_member_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with auth_m as (
    select m.id, m.family_id, m.gym_id
    from public.members m
    where m.auth_user_id = auth.uid()
       or (auth.jwt() ->> 'email' is not null and m.email = auth.jwt() ->> 'email')
    limit 1
  )
  select auth_m.id from auth_m
  union
  select m2.id
  from public.members m2
  inner join auth_m on m2.family_id = auth_m.family_id and m2.gym_id = auth_m.gym_id
  where auth_m.family_id is not null;
$$;

create or replace function public.can_access_member(target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_member_id in (select public.accessible_member_ids());
$$;

-- Update member portal RLS policies to use family-aware access

drop policy if exists "attendance_member_select" on public.attendance;
create policy "attendance_member_select" on public.attendance
  for select using (public.can_access_member(member_id));

drop policy if exists "attendance_member_insert" on public.attendance;
create policy "attendance_member_insert" on public.attendance
  for insert with check (public.can_access_member(member_id));

drop policy if exists "waiver_signatures_member_select" on public.waiver_signatures;
create policy "waiver_signatures_member_select" on public.waiver_signatures
  for select using (public.can_access_member(member_id));

drop policy if exists "waiver_signatures_member_insert" on public.waiver_signatures;
create policy "waiver_signatures_member_insert" on public.waiver_signatures
  for insert with check (public.can_access_member(member_id));

drop policy if exists "subscriptions_member_select" on public.subscriptions;
create policy "subscriptions_member_select" on public.subscriptions
  for select using (public.can_access_member(member_id));

drop policy if exists "emergency_contacts_member_select" on public.emergency_contacts;
create policy "emergency_contacts_member_select" on public.emergency_contacts
  for select using (public.can_access_member(member_id));

drop policy if exists "emergency_contacts_member_insert" on public.emergency_contacts;
create policy "emergency_contacts_member_insert" on public.emergency_contacts
  for insert with check (public.can_access_member(member_id));

drop policy if exists "class_waitlist_member_select" on public.class_waitlist;
create policy "class_waitlist_member_select" on public.class_waitlist
  for select using (public.can_access_member(member_id));

drop policy if exists "class_waitlist_member_insert" on public.class_waitlist;
create policy "class_waitlist_member_insert" on public.class_waitlist
  for insert with check (public.can_access_member(member_id));

-- Supervisor read access on leads (admin retains write via existing policies)
drop policy if exists leads_supervisor_select on public.leads;
create policy leads_supervisor_select on public.leads
  for select using (public.is_gym_supervisor(gym_id));

drop policy if exists leads_supervisor_write on public.leads;
create policy leads_supervisor_write on public.leads
  for insert with check (public.is_gym_supervisor(gym_id));

drop policy if exists leads_supervisor_update on public.leads;
create policy leads_supervisor_update on public.leads
  for update using (public.is_gym_supervisor(gym_id));

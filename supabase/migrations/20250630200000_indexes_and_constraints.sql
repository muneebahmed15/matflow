-- Additional indexes and constraints for MatsFlow production workloads

-- Members: unique email per gym (case-insensitive, when email present)
create unique index if not exists idx_members_gym_email_unique
  on public.members (gym_id, lower(email))
  where email is not null and email <> '';

-- Members: faster auth_user_id lookups for portal
create index if not exists idx_members_auth_user_id
  on public.members (auth_user_id)
  where auth_user_id is not null;

-- Attendance: hot path for gym + date range queries
create index if not exists idx_attendance_gym_checked_in
  on public.attendance (gym_id, checked_in_at desc);

-- Subscriptions: status filtering per gym
create index if not exists idx_subscriptions_gym_status
  on public.subscriptions (gym_id, status);

-- Staff roles: user lookup
create index if not exists idx_staff_roles_gym_user
  on public.staff_roles (gym_id, user_id);

-- Leads: pipeline views
create index if not exists idx_leads_gym_status_created
  on public.leads (gym_id, status, created_at desc);

-- Plans: active plans per gym
create index if not exists idx_plans_gym_active
  on public.plans (gym_id, is_active);

-- Gyms: owner lookup (legacy owner fallback)
create index if not exists idx_gyms_owner_id
  on public.gyms (owner_id);

-- Prevent empty gym names
alter table public.gyms
  drop constraint if exists gyms_name_not_empty,
  add constraint gyms_name_not_empty check (char_length(trim(name)) > 0);

-- Prevent empty slugs
alter table public.gyms
  drop constraint if exists gyms_slug_not_empty,
  add constraint gyms_slug_not_empty check (char_length(trim(slug)) > 0);

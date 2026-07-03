-- Class enrollments: recurring class booking with capacity enforcement

create table if not exists public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  enrolled_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (class_id, member_id)
);

create index if not exists idx_class_enrollments_class
  on public.class_enrollments(class_id) where status = 'active';
create index if not exists idx_class_enrollments_member
  on public.class_enrollments(member_id) where status = 'active';
create index if not exists idx_class_enrollments_gym
  on public.class_enrollments(gym_id);

alter table public.class_enrollments enable row level security;

drop policy if exists "class_enrollments_staff_all" on public.class_enrollments;
create policy "class_enrollments_staff_all" on public.class_enrollments
  for all using (public.is_gym_staff(gym_id))
  with check (public.is_gym_staff(gym_id));

drop policy if exists "class_enrollments_member_select" on public.class_enrollments;
create policy "class_enrollments_member_select" on public.class_enrollments
  for select using (public.can_access_member(member_id));

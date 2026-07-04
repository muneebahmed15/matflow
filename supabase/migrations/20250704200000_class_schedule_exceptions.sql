-- One-off class cancellations (schedule exceptions)
create table if not exists public.class_schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  exception_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (class_id, exception_date)
);

create index if not exists idx_class_schedule_exceptions_gym_date
  on public.class_schedule_exceptions(gym_id, exception_date);

alter table public.class_schedule_exceptions enable row level security;

drop policy if exists class_schedule_exceptions_admin on public.class_schedule_exceptions;
create policy class_schedule_exceptions_admin on public.class_schedule_exceptions
  for all using (public.is_gym_admin(gym_id));

drop policy if exists class_schedule_exceptions_member_select on public.class_schedule_exceptions;
create policy class_schedule_exceptions_member_select on public.class_schedule_exceptions
  for select using (
    gym_id in (
      select m.gym_id from public.members m where m.id = public.current_member_id()
    )
  );

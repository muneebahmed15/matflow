-- Drop-in (single session) bookings + cancellation policy window

alter table public.gyms add column if not exists booking_cancel_hours integer not null default 2
  check (booking_cancel_hours >= 0);

create table if not exists public.class_session_bookings (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status text not null default 'booked' check (status in ('booked', 'cancelled')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (session_id, member_id)
);

create index if not exists idx_session_bookings_session
  on public.class_session_bookings(session_id) where status = 'booked';
create index if not exists idx_session_bookings_member
  on public.class_session_bookings(member_id) where status = 'booked';

alter table public.class_session_bookings enable row level security;

drop policy if exists "class_session_bookings_staff_all" on public.class_session_bookings;
create policy "class_session_bookings_staff_all" on public.class_session_bookings
  for all using (public.is_gym_staff(gym_id))
  with check (public.is_gym_staff(gym_id));

drop policy if exists "class_session_bookings_member_select" on public.class_session_bookings;
create policy "class_session_bookings_member_select" on public.class_session_bookings
  for select using (public.can_access_member(member_id));

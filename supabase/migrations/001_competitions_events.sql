-- Competitions and gym events for MatFlow feature pages

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  name text not null,
  event_date date,
  division text,
  result text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.gym_events (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  title text not null,
  event_type text not null default 'open_mat',
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  description text,
  capacity integer,
  created_at timestamptz not null default now()
);

create index if not exists competitions_gym_id_idx on public.competitions(gym_id);
create index if not exists gym_events_gym_id_idx on public.gym_events(gym_id);

alter table public.competitions enable row level security;
alter table public.gym_events enable row level security;

create policy "Gym staff can manage competitions"
  on public.competitions for all
  using (
    gym_id in (
      select id from public.gyms where owner_id = auth.uid()
      union
      select gym_id from public.staff_roles where user_id = auth.uid()
    )
  )
  with check (
    gym_id in (
      select id from public.gyms where owner_id = auth.uid()
      union
      select gym_id from public.staff_roles where user_id = auth.uid()
    )
  );

create policy "Gym staff can manage gym events"
  on public.gym_events for all
  using (
    gym_id in (
      select id from public.gyms where owner_id = auth.uid()
      union
      select gym_id from public.staff_roles where user_id = auth.uid()
    )
  )
  with check (
    gym_id in (
      select id from public.gyms where owner_id = auth.uid()
      union
      select gym_id from public.staff_roles where user_id = auth.uid()
    )
  );

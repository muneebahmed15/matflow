-- Belt engine: per-gym belt systems, promotion metadata, and promotion requirements

-- Per-gym belt system preset key (bjj_adult, bjj_kids, karate, tkd, custom order via belt_custom_order)
alter table public.gyms add column if not exists belt_system text not null default 'bjj_adult';
alter table public.gyms add column if not exists belt_custom_order jsonb;

-- Promotion metadata: ceremony date (may differ from log date) and who logged it
alter table public.belt_promotions add column if not exists ceremony_date date;
alter table public.belt_promotions add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Per-belt promotion requirements
create table if not exists public.belt_requirements (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  belt text not null,
  min_attendance integer not null default 0 check (min_attendance >= 0),
  min_days_at_rank integer not null default 0 check (min_days_at_rank >= 0),
  techniques_checklist text,
  created_at timestamptz not null default now(),
  unique (gym_id, belt)
);

create index if not exists idx_belt_requirements_gym on public.belt_requirements(gym_id);

alter table public.belt_requirements enable row level security;

drop policy if exists "belt_requirements_staff_all" on public.belt_requirements;
create policy "belt_requirements_staff_all" on public.belt_requirements
  for all using (public.is_gym_staff(gym_id))
  with check (public.is_gym_staff(gym_id));

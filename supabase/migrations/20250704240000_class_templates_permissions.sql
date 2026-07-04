-- Seasonal schedule templates, class staff permission overrides

create table if not exists public.class_schedule_templates (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  season_label text,
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, name)
);

create table if not exists public.class_schedule_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.class_schedule_templates(id) on delete cascade,
  name text not null,
  description text,
  instructor text not null,
  day_of_week text not null,
  start_time text not null,
  end_time text not null,
  capacity integer not null default 20 check (capacity >= 1),
  category_tag text,
  color text,
  overbook_allowance integer not null default 0 check (overbook_allowance >= 0),
  sort_order integer not null default 0
);

create index if not exists idx_class_schedule_templates_gym
  on public.class_schedule_templates(gym_id);

create table if not exists public.class_staff_permissions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  staff_id uuid not null references public.staff_roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, staff_id)
);

create index if not exists idx_class_staff_permissions_staff
  on public.class_staff_permissions(staff_id, gym_id);

alter table public.class_schedule_templates enable row level security;
alter table public.class_schedule_template_items enable row level security;
alter table public.class_staff_permissions enable row level security;

drop policy if exists "class_schedule_templates_staff_all" on public.class_schedule_templates;
create policy "class_schedule_templates_staff_all" on public.class_schedule_templates
  for all using (public.is_gym_staff(gym_id))
  with check (public.is_gym_staff(gym_id));

drop policy if exists "class_schedule_template_items_staff_all" on public.class_schedule_template_items;
create policy "class_schedule_template_items_staff_all" on public.class_schedule_template_items
  for all using (
    exists (
      select 1 from public.class_schedule_templates t
      where t.id = template_id and public.is_gym_staff(t.gym_id)
    )
  )
  with check (
    exists (
      select 1 from public.class_schedule_templates t
      where t.id = template_id and public.is_gym_staff(t.gym_id)
    )
  );

drop policy if exists "class_staff_permissions_staff_all" on public.class_staff_permissions;
create policy "class_staff_permissions_staff_all" on public.class_staff_permissions
  for all using (public.is_gym_staff(gym_id))
  with check (public.is_gym_staff(gym_id));

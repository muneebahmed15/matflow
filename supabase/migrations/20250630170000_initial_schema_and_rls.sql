-- MatsFlow baseline schema + Row Level Security
-- Apply via Supabase SQL editor or: supabase db push

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.is_gym_owner(gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gyms g
    where g.id = gym_id and g.owner_id = auth.uid()
  );
$$;

create or replace function public.is_gym_staff(gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_gym_owner(gym_id)
    or exists (
      select 1 from public.staff_roles sr
      where sr.gym_id = gym_id and sr.user_id = auth.uid()
    );
$$;

create or replace function public.is_gym_admin(gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_gym_owner(gym_id)
    or exists (
      select 1 from public.staff_roles sr
      where sr.gym_id = gym_id
        and sr.user_id = auth.uid()
        and sr.role = 'admin'
    );
$$;

create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
  from public.members m
  where m.auth_user_id = auth.uid()
     or (auth.jwt() ->> 'email' is not null and m.email = auth.jwt() ->> 'email')
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Core tables (idempotent for existing projects)
-- ---------------------------------------------------------------------------

create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  kiosk_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  role text not null check (role in ('admin', 'coach')),
  full_name text,
  created_at timestamptz not null default now(),
  unique (user_id, gym_id)
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  family_name text not null,
  primary_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  belt_rank text default 'white',
  status text not null default 'active',
  family_id uuid references public.families(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.members add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2),
  price_cents integer,
  interval text not null check (interval in ('month', 'year')),
  stripe_product_id text,
  stripe_price_id text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  status text not null default 'active',
  current_period_end timestamptz,
  cancellation_reason text,
  cancelled_at timestamptz,
  paused_at timestamptz,
  pause_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references auth.users(id) on delete set null,
  notes text
);

create table if not exists public.waivers (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  title text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.waiver_signatures (
  id uuid primary key default gen_random_uuid(),
  waiver_id uuid not null references public.waivers(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  signed_name text not null,
  signed_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  instructor text,
  day_of_week text,
  start_time text,
  end_time text,
  capacity integer default 20,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  source text,
  status text not null default 'new',
  notes text,
  interested_in text,
  converted_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.belt_promotions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  from_belt text not null,
  to_belt text not null,
  notes text,
  promoted_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  type text not null,
  subject text,
  body text,
  sent_at timestamptz
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  stripe_refund_id text,
  amount_cents integer,
  reason text,
  issued_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_members_gym on public.members(gym_id);
create index if not exists idx_members_email on public.members(email);
create index if not exists idx_attendance_gym_date on public.attendance(gym_id, checked_in_at desc);
create index if not exists idx_staff_roles_user on public.staff_roles(user_id);

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.gyms enable row level security;
alter table public.staff_roles enable row level security;
alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.attendance enable row level security;
alter table public.waivers enable row level security;
alter table public.waiver_signatures enable row level security;
alter table public.classes enable row level security;
alter table public.leads enable row level security;
alter table public.belt_promotions enable row level security;
alter table public.notifications enable row level security;
alter table public.refunds enable row level security;

-- ---------------------------------------------------------------------------
-- gyms policies
-- ---------------------------------------------------------------------------

drop policy if exists "gyms_select_staff" on public.gyms;
create policy "gyms_select_staff" on public.gyms
  for select using (public.is_gym_staff(id));

drop policy if exists "gyms_select_kiosk_slug" on public.gyms;
create policy "gyms_select_kiosk_slug" on public.gyms
  for select using (kiosk_enabled = true);

drop policy if exists "gyms_insert_owner" on public.gyms;
create policy "gyms_insert_owner" on public.gyms
  for insert with check (owner_id = auth.uid());

drop policy if exists "gyms_update_admin" on public.gyms;
create policy "gyms_update_admin" on public.gyms
  for update using (public.is_gym_admin(id));

-- ---------------------------------------------------------------------------
-- staff_roles policies
-- ---------------------------------------------------------------------------

drop policy if exists "staff_roles_select_staff" on public.staff_roles;
create policy "staff_roles_select_staff" on public.staff_roles
  for select using (public.is_gym_staff(gym_id));

drop policy if exists "staff_roles_admin_write" on public.staff_roles;
create policy "staff_roles_admin_write" on public.staff_roles
  for all using (public.is_gym_admin(gym_id))
  with check (public.is_gym_admin(gym_id));

-- ---------------------------------------------------------------------------
-- members policies
-- ---------------------------------------------------------------------------

drop policy if exists "members_staff_all" on public.members;
create policy "members_staff_all" on public.members
  for all using (public.is_gym_staff(gym_id))
  with check (public.is_gym_staff(gym_id));

drop policy if exists "members_select_self" on public.members;
create policy "members_select_self" on public.members
  for select using (id = public.current_member_id());

drop policy if exists "members_update_link_auth" on public.members;
create policy "members_update_link_auth" on public.members
  for update using (
    email = auth.jwt() ->> 'email' and auth_user_id is null
  ) with check (auth_user_id = auth.uid());

drop policy if exists "members_kiosk_select" on public.members;
create policy "members_kiosk_select" on public.members
  for select using (
    status = 'active'
    and exists (
      select 1 from public.gyms g
      where g.id = members.gym_id and g.kiosk_enabled = true
    )
  );

-- ---------------------------------------------------------------------------
-- Generic gym-scoped staff policies
-- ---------------------------------------------------------------------------

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'families', 'plans', 'subscriptions', 'attendance', 'waivers',
    'waiver_signatures', 'classes', 'leads', 'belt_promotions', 'notifications', 'refunds'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', tbl || '_staff_all', tbl);
    execute format(
      'create policy %I on public.%I for all using (public.is_gym_staff(gym_id)) with check (public.is_gym_staff(gym_id))',
      tbl || '_staff_all', tbl
    );
  end loop;
end $$;

-- Member read policies for portal
drop policy if exists "attendance_member_select" on public.attendance;
create policy "attendance_member_select" on public.attendance
  for select using (member_id = public.current_member_id());

drop policy if exists "waiver_signatures_member_select" on public.waiver_signatures;
create policy "waiver_signatures_member_select" on public.waiver_signatures
  for select using (member_id = public.current_member_id());

drop policy if exists "waiver_signatures_member_insert" on public.waiver_signatures;
create policy "waiver_signatures_member_insert" on public.waiver_signatures
  for insert with check (member_id = public.current_member_id());

drop policy if exists "subscriptions_member_select" on public.subscriptions;
create policy "subscriptions_member_select" on public.subscriptions
  for select using (member_id = public.current_member_id());

drop policy if exists "plans_member_select" on public.plans;
create policy "plans_member_select" on public.plans
  for select using (
    is_active = true
    and gym_id in (
      select m.gym_id from public.members m where m.id = public.current_member_id()
    )
  );

drop policy if exists "waivers_member_select" on public.waivers;
create policy "waivers_member_select" on public.waivers
  for select using (
    is_active = true
    and gym_id in (
      select m.gym_id from public.members m where m.id = public.current_member_id()
    )
  );

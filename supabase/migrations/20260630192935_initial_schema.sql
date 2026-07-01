-- MatsFlow initial schema

create extension if not exists "pgcrypto";

-- Helper: current user's gym id (owner or staff)
create or replace function public.user_gym_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.gyms where owner_id = auth.uid()
  union
  select gym_id from public.staff_roles where user_id = auth.uid();
$$;

create or replace function public.is_gym_member(p_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.gym_id = p_gym_id
      and lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- gyms
create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Gym',
  slug text not null unique,
  kiosk_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists gyms_owner_id_idx on public.gyms(owner_id);

-- families
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  family_name text not null,
  primary_email text,
  created_at timestamptz not null default now()
);

create index if not exists families_gym_id_idx on public.families(gym_id);

-- members
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  family_id uuid references public.families(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  belt_rank text not null default 'white',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists members_gym_id_idx on public.members(gym_id);
create index if not exists members_email_idx on public.members(lower(email));

-- staff_roles
create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  role text not null check (role in ('admin', 'coach')),
  full_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, gym_id)
);

create index if not exists staff_roles_gym_id_idx on public.staff_roles(gym_id);

-- attendance
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references auth.users(id) on delete set null,
  notes text
);

create index if not exists attendance_gym_id_idx on public.attendance(gym_id);
create index if not exists attendance_member_id_idx on public.attendance(member_id);

-- classes
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  instructor text not null,
  day_of_week text not null,
  start_time text not null,
  end_time text not null,
  capacity integer not null default 20,
  created_at timestamptz not null default now()
);

create index if not exists classes_gym_id_idx on public.classes(gym_id);

-- waivers
create table if not exists public.waivers (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  title text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists waivers_gym_id_idx on public.waivers(gym_id);

-- waiver_signatures
create table if not exists public.waiver_signatures (
  id uuid primary key default gen_random_uuid(),
  waiver_id uuid not null references public.waivers(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  signed_name text not null,
  signed_at timestamptz not null default now(),
  ip_address text,
  unique (waiver_id, member_id)
);

create index if not exists waiver_signatures_member_id_idx on public.waiver_signatures(member_id);

-- plans
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null,
  price_cents integer not null,
  interval text not null check (interval in ('month', 'year', 'week', 'day')),
  stripe_product_id text,
  stripe_price_id text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists plans_gym_id_idx on public.plans(gym_id);

-- subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  status text not null default 'active',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_gym_id_idx on public.subscriptions(gym_id);
create index if not exists subscriptions_member_id_idx on public.subscriptions(member_id);

-- leads
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

create index if not exists leads_gym_id_idx on public.leads(gym_id);

-- belt_promotions
create table if not exists public.belt_promotions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  from_belt text not null,
  to_belt text not null,
  promoted_at timestamptz not null default now(),
  notes text
);

create index if not exists belt_promotions_gym_id_idx on public.belt_promotions(gym_id);

-- notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  type text not null,
  subject text not null,
  body text not null,
  sent_at timestamptz not null default now()
);

-- refunds
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  stripe_refund_id text not null,
  amount_cents integer not null,
  reason text,
  issued_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Auto-create gym on owner signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  gym_name text;
  gym_slug text;
begin
  gym_name := trim(
    coalesce(new.raw_user_meta_data ->> 'first_name', 'My')
    || ' '
    || coalesce(new.raw_user_meta_data ->> 'last_name', 'Gym')
  );
  if gym_name = '' then
    gym_name := 'My Gym';
  end if;

  gym_slug := lower(regexp_replace(gym_name, '[^a-z0-9]+', '-', 'g'));
  gym_slug := trim(both '-' from gym_slug);
  if gym_slug = '' then
    gym_slug := 'gym';
  end if;
  gym_slug := gym_slug || '-' || substr(replace(new.id::text, '-', ''), 1, 6);

  insert into public.gyms (owner_id, name, slug)
  values (new.id, gym_name, gym_slug);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: current user's gym id (owner or staff)
create or replace function public.user_gym_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.gyms where owner_id = auth.uid()
  union
  select gym_id from public.staff_roles where user_id = auth.uid();
$$;

create or replace function public.is_gym_member(p_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.gym_id = p_gym_id
      and lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- RLS
alter table public.gyms enable row level security;
alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.staff_roles enable row level security;
alter table public.attendance enable row level security;
alter table public.classes enable row level security;
alter table public.waivers enable row level security;
alter table public.waiver_signatures enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.leads enable row level security;
alter table public.belt_promotions enable row level security;
alter table public.notifications enable row level security;
alter table public.refunds enable row level security;

-- gyms policies
create policy "Owners manage their gym"
  on public.gyms for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Staff read their gym"
  on public.gyms for select
  using (id in (select public.user_gym_ids()));

create policy "Members read their gym"
  on public.gyms for select
  using (public.is_gym_member(id));

create policy "Public kiosk read by slug"
  on public.gyms for select
  using (kiosk_enabled = true);

-- Generic staff/owner gym-scoped access helper policies
create policy "Staff manage families"
  on public.families for all
  using (gym_id in (select public.user_gym_ids()))
  with check (gym_id in (select public.user_gym_ids()));

create policy "Staff manage members"
  on public.members for all
  using (gym_id in (select public.user_gym_ids()))
  with check (gym_id in (select public.user_gym_ids()));

create policy "Members read own profile"
  on public.members for select
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "Members update own profile"
  on public.members for update
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "Kiosk read active members"
  on public.members for select
  using (
    status = 'active'
    and gym_id in (select id from public.gyms where kiosk_enabled = true)
  );

create policy "Admins manage staff roles"
  on public.staff_roles for all
  using (
    gym_id in (select id from public.gyms where owner_id = auth.uid())
    or user_id = auth.uid()
  )
  with check (gym_id in (select id from public.gyms where owner_id = auth.uid()));

create policy "Staff read staff roles"
  on public.staff_roles for select
  using (gym_id in (select public.user_gym_ids()));

create policy "Staff manage attendance"
  on public.attendance for all
  using (gym_id in (select public.user_gym_ids()))
  with check (gym_id in (select public.user_gym_ids()));

create policy "Members read own attendance"
  on public.attendance for select
  using (
    member_id in (
      select id from public.members
      where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy "Staff manage classes"
  on public.classes for all
  using (gym_id in (select public.user_gym_ids()))
  with check (gym_id in (select public.user_gym_ids()));

create policy "Staff manage waivers"
  on public.waivers for all
  using (gym_id in (select public.user_gym_ids()))
  with check (gym_id in (select public.user_gym_ids()));

create policy "Members read active waivers"
  on public.waivers for select
  using (is_active = true and public.is_gym_member(gym_id));

create policy "Staff manage waiver signatures"
  on public.waiver_signatures for all
  using (gym_id in (select public.user_gym_ids()))
  with check (gym_id in (select public.user_gym_ids()));

create policy "Members manage own waiver signatures"
  on public.waiver_signatures for all
  using (
    member_id in (
      select id from public.members
      where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  with check (
    member_id in (
      select id from public.members
      where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy "Staff manage plans"
  on public.plans for all
  using (gym_id in (select public.user_gym_ids()))
  with check (gym_id in (select public.user_gym_ids()));

create policy "Members read active plans"
  on public.plans for select
  using (is_active = true and public.is_gym_member(gym_id));

create policy "Staff manage subscriptions"
  on public.subscriptions for all
  using (gym_id in (select public.user_gym_ids()))
  with check (gym_id in (select public.user_gym_ids()));

create policy "Members read own subscriptions"
  on public.subscriptions for select
  using (
    member_id in (
      select id from public.members
      where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy "Staff manage leads"
  on public.leads for all
  using (gym_id in (select public.user_gym_ids()))
  with check (gym_id in (select public.user_gym_ids()));

create policy "Staff manage belt promotions"
  on public.belt_promotions for all
  using (gym_id in (select public.user_gym_ids()))
  with check (gym_id in (select public.user_gym_ids()));

create policy "Staff read notifications"
  on public.notifications for select
  using (gym_id in (select public.user_gym_ids()));

create policy "Staff read refunds"
  on public.refunds for select
  using (gym_id in (select public.user_gym_ids()));

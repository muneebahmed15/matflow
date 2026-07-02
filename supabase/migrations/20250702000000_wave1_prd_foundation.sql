-- Wave 1: PRD foundation — branding, CRM notes, emergency contacts, class waitlists, waiver expiry, belt stripes

-- ---------------------------------------------------------------------------
-- Gym branding & public website
-- ---------------------------------------------------------------------------
alter table public.gyms add column if not exists website_enabled boolean not null default false;
alter table public.gyms add column if not exists logo_url text;
alter table public.gyms add column if not exists primary_color text default '#2563eb';
alter table public.gyms add column if not exists tagline text;
alter table public.gyms add column if not exists about_text text;
alter table public.gyms add column if not exists contact_email text;
alter table public.gyms add column if not exists contact_phone text;
alter table public.gyms add column if not exists address_line1 text;
alter table public.gyms add column if not exists address_city text;
alter table public.gyms add column if not exists address_state text;
alter table public.gyms add column if not exists address_zip text;

-- Public read for website-enabled gyms (slug lookup for anon)
drop policy if exists "gyms_select_public_website" on public.gyms;
create policy "gyms_select_public_website" on public.gyms
  for select using (website_enabled = true);

-- ---------------------------------------------------------------------------
-- Belt stripes
-- ---------------------------------------------------------------------------
alter table public.members add column if not exists stripe_count integer not null default 0
  check (stripe_count >= 0 and stripe_count <= 4);

-- ---------------------------------------------------------------------------
-- Waiver expiration
-- ---------------------------------------------------------------------------
alter table public.waivers add column if not exists expires_after_days integer;
alter table public.waiver_signatures add column if not exists expires_at timestamptz;

-- ---------------------------------------------------------------------------
-- CRM notes
-- ---------------------------------------------------------------------------
create table if not exists public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  note_type text not null default 'general'
    check (note_type in ('general', 'call', 'email', 'in_person', 'system')),
  body text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  constraint crm_notes_has_subject check (member_id is not null or lead_id is not null)
);

create index if not exists idx_crm_notes_member on public.crm_notes(member_id, created_at desc);
create index if not exists idx_crm_notes_lead on public.crm_notes(lead_id, created_at desc);
create index if not exists idx_crm_notes_gym on public.crm_notes(gym_id, created_at desc);

alter table public.crm_notes enable row level security;

drop policy if exists "crm_notes_staff_all" on public.crm_notes;
create policy "crm_notes_staff_all" on public.crm_notes
  for all using (public.is_gym_staff(gym_id))
  with check (public.is_gym_staff(gym_id));

-- ---------------------------------------------------------------------------
-- Emergency contacts
-- ---------------------------------------------------------------------------
create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  full_name text not null,
  phone text not null,
  relationship text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_emergency_contacts_member on public.emergency_contacts(member_id);

alter table public.emergency_contacts enable row level security;

drop policy if exists "emergency_contacts_staff_all" on public.emergency_contacts;
create policy "emergency_contacts_staff_all" on public.emergency_contacts
  for all using (public.is_gym_staff(gym_id))
  with check (public.is_gym_staff(gym_id));

drop policy if exists "emergency_contacts_member_select" on public.emergency_contacts;
create policy "emergency_contacts_member_select" on public.emergency_contacts
  for select using (member_id = public.current_member_id());

-- ---------------------------------------------------------------------------
-- Class waitlists
-- ---------------------------------------------------------------------------
create table if not exists public.class_waitlist (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  position integer not null default 1,
  status text not null default 'waiting'
    check (status in ('waiting', 'offered', 'enrolled', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (class_id, member_id)
);

create index if not exists idx_class_waitlist_class on public.class_waitlist(class_id, position);

alter table public.class_waitlist enable row level security;

drop policy if exists "class_waitlist_staff_all" on public.class_waitlist;
create policy "class_waitlist_staff_all" on public.class_waitlist
  for all using (public.is_gym_staff(gym_id))
  with check (public.is_gym_staff(gym_id));

drop policy if exists "class_waitlist_member_select" on public.class_waitlist;
create policy "class_waitlist_member_select" on public.class_waitlist
  for select using (member_id = public.current_member_id());

drop policy if exists "class_waitlist_member_insert" on public.class_waitlist;
create policy "class_waitlist_member_insert" on public.class_waitlist
  for insert with check (member_id = public.current_member_id());

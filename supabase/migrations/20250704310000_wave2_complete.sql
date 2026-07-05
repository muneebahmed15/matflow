-- Wave 2 completion: payments polish, belts, waivers, CRM, migration imports

-- Payments: setup fee, tax, provider config
alter table public.plans
  add column if not exists setup_fee_cents integer not null default 0,
  add column if not exists stripe_setup_price_id text;

alter table public.gyms
  add column if not exists stripe_tax_enabled boolean not null default false,
  add column if not exists payment_provider text not null default 'stripe',
  add column if not exists stripe_only boolean not null default true,
  add column if not exists waiver_retention_days integer;

alter table public.gyms drop constraint if exists gyms_payment_provider_check;
alter table public.gyms
  add constraint gyms_payment_provider_check
  check (payment_provider in ('stripe'));

-- Family subscriptions
alter table public.subscriptions
  add column if not exists family_id uuid references public.families(id) on delete set null;

create index if not exists idx_subscriptions_family_id on public.subscriptions (family_id);

-- Belt promotion approval workflow
create table if not exists public.belt_promotion_requests (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  from_belt text not null,
  to_belt text not null,
  notes text,
  ceremony_date date,
  status text not null default 'pending',
  proposed_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint belt_promotion_requests_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists idx_belt_promotion_requests_gym_status
  on public.belt_promotion_requests (gym_id, status);

alter table public.belt_promotion_requests enable row level security;

create policy belt_promotion_requests_staff_select on public.belt_promotion_requests
  for select using (public.is_gym_staff(gym_id));

create policy belt_promotion_requests_staff_insert on public.belt_promotion_requests
  for insert with check (public.is_gym_staff(gym_id));

create policy belt_promotion_requests_staff_update on public.belt_promotion_requests
  for update using (public.is_gym_staff(gym_id));

-- Coach availability
create table if not exists public.staff_availability (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  staff_id uuid not null references public.staff_roles(id) on delete cascade,
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint staff_availability_day_check check (day_of_week between 0 and 6),
  constraint staff_availability_time_check check (start_time < end_time)
);

create index if not exists idx_staff_availability_gym_staff
  on public.staff_availability (gym_id, staff_id);

alter table public.staff_availability enable row level security;

create policy staff_availability_staff_select on public.staff_availability
  for select using (public.is_gym_staff(gym_id));

create policy staff_availability_admin_all on public.staff_availability
  for all using (public.is_gym_admin(gym_id));

-- Waiver signature enhancements
alter table public.waiver_signatures
  add column if not exists signature_image_url text,
  add column if not exists witness_name text,
  add column if not exists witness_signature_url text,
  add column if not exists legal_hold boolean not null default false;

-- Waiver PDF import storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'waiver-imports',
  'waiver-imports',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do nothing;

create policy waiver_imports_staff_select on storage.objects
  for select using (
    bucket_id = 'waiver-imports'
    and exists (
      select 1 from public.staff_roles sr
      where sr.user_id = auth.uid()
        and sr.gym_id::text = (storage.foldername(name))[1]
    )
  );

create policy waiver_imports_staff_insert on storage.objects
  for insert with check (
    bucket_id = 'waiver-imports'
    and exists (
      select 1 from public.staff_roles sr
      where sr.user_id = auth.uid()
        and sr.gym_id::text = (storage.foldername(name))[1]
    )
  );

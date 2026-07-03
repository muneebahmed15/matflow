-- Multi-tenant polish: locale, staff read access to locations, class location FK

alter table public.gyms add column if not exists locale text not null default 'en-US';

-- Optional location scoping for classes (multi-location gyms)
alter table public.classes add column if not exists location_id uuid
  references public.gym_locations(id) on delete set null;

-- gym_locations was admin-only; allow all gym staff to read locations
drop policy if exists "gym_locations_staff_read" on public.gym_locations;
create policy "gym_locations_staff_read" on public.gym_locations
  for select using (public.is_gym_staff(gym_id));

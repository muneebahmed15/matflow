-- Module 1.7: location-scoped attendance
alter table public.attendance
  add column if not exists location_id uuid references public.gym_locations(id) on delete set null;

create index if not exists idx_attendance_location_id
  on public.attendance (gym_id, location_id, checked_in_at desc)
  where location_id is not null;

-- Module 7.18: dedicated hero background image
alter table public.gyms
  add column if not exists hero_image_url text;

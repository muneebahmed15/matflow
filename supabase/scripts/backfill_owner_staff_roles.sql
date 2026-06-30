-- Backfill owner staff_roles for gyms created before onboard inserted admin rows.
insert into public.staff_roles (gym_id, user_id, role, full_name)
select
  g.id,
  g.owner_id,
  'admin',
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    split_part(u.email, '@', 1),
    'Owner'
  )
from public.gyms g
join auth.users u on u.id = g.owner_id
where not exists (
  select 1 from public.staff_roles sr
  where sr.gym_id = g.id and sr.user_id = g.owner_id
);

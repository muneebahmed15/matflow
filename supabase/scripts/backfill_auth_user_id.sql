-- Backfill members.auth_user_id from auth.users by email match.
-- Run once after applying RLS migrations.

update public.members m
set auth_user_id = u.id
from auth.users u
where m.auth_user_id is null
  and m.email is not null
  and lower(trim(m.email)) = lower(trim(u.email));

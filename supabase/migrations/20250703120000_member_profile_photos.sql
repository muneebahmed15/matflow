-- Member profile photos + public avatar storage

alter table public.members
  add column if not exists profile_photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-avatars',
  'member-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "member_avatars_public_read" on storage.objects;
create policy "member_avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'member-avatars');

drop policy if exists "member_avatars_service_insert" on storage.objects;
create policy "member_avatars_service_insert"
  on storage.objects for insert
  with check (bucket_id = 'member-avatars');

drop policy if exists "member_avatars_service_update" on storage.objects;
create policy "member_avatars_service_update"
  on storage.objects for update
  using (bucket_id = 'member-avatars');

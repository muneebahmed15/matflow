-- Wave 5: waiver PDF storage, waitlist promotion tracking

alter table public.waiver_signatures
  add column if not exists pdf_storage_path text,
  add column if not exists ip_address text,
  add column if not exists user_agent text;

alter table public.class_waitlist
  add column if not exists promoted_at timestamptz,
  add column if not exists notified_at timestamptz;

-- Storage bucket for signed waiver PDFs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'waiver-signatures',
  'waiver-signatures',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do nothing;

-- Staff can read all waiver PDFs for their gym (path: gymId/signatureId.pdf)
drop policy if exists "waiver_signatures_storage_staff_select" on storage.objects;
create policy "waiver_signatures_storage_staff_select"
  on storage.objects for select
  using (
    bucket_id = 'waiver-signatures'
    and exists (
      select 1 from public.staff_roles sr
      where sr.user_id = auth.uid()
        and sr.gym_id::text = (storage.foldername(name))[1]
    )
  );

-- Members can read their own waiver PDFs
drop policy if exists "waiver_signatures_storage_member_select" on storage.objects;
create policy "waiver_signatures_storage_member_select"
  on storage.objects for select
  using (
    bucket_id = 'waiver-signatures'
    and exists (
      select 1 from public.waiver_signatures ws
      join public.members m on m.id = ws.member_id
      where ws.pdf_storage_path = name
        and m.auth_user_id = auth.uid()
    )
  );

-- Service role uploads (server-side signing)
drop policy if exists "waiver_signatures_storage_insert" on storage.objects;
create policy "waiver_signatures_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'waiver-signatures');

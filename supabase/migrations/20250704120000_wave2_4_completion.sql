-- Wave 2–4 completion: trial waivers, lead assignment, class description, immutable signatures

-- Trial / lead waiver signatures
alter table public.waiver_signatures
  add column if not exists lead_id uuid references public.leads(id) on delete cascade;

alter table public.waiver_signatures
  alter column member_id drop not null;

alter table public.waiver_signatures
  drop constraint if exists waiver_signatures_signer_check;

alter table public.waiver_signatures
  add constraint waiver_signatures_signer_check
  check (member_id is not null or lead_id is not null);

create index if not exists idx_waiver_signatures_lead_id
  on public.waiver_signatures(lead_id) where lead_id is not null;

-- Lead assignment
alter table public.leads
  add column if not exists assigned_staff_id uuid references public.staff_roles(id) on delete set null;

-- Class description
alter table public.classes
  add column if not exists description text;

-- Marketing tracking placeholders
alter table public.email_campaigns
  add column if not exists open_count integer not null default 0;

alter table public.email_campaigns
  add column if not exists click_count integer not null default 0;

-- Immutable waiver signatures (no UPDATE/DELETE via RLS; service role bypasses)
drop policy if exists "waiver_signatures_no_update" on public.waiver_signatures;
create policy "waiver_signatures_no_update" on public.waiver_signatures
  for update using (false);

drop policy if exists "waiver_signatures_no_delete" on public.waiver_signatures;
create policy "waiver_signatures_no_delete" on public.waiver_signatures
  for delete using (false);

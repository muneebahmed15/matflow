-- Wave 2: member tags + family billing contact
alter table public.members
  add column if not exists tags text[] not null default '{}';

create index if not exists idx_members_tags on public.members using gin (tags);

alter table public.families
  add column if not exists billing_member_id uuid references public.members(id) on delete set null;

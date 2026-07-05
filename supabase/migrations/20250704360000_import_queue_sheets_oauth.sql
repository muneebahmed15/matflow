-- Async import queue: payload storage + Google Sheets OAuth tokens

alter table public.import_jobs
  add column if not exists payload jsonb,
  add column if not exists progress_offset integer not null default 0,
  add column if not exists queue_options jsonb;

create index if not exists idx_import_jobs_queue
  on public.import_jobs(status, created_at)
  where payload is not null and status in ('pending', 'processing');

create table if not exists public.google_sheets_connections (
  gym_id uuid primary key references public.gyms(id) on delete cascade,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_sheets_connections enable row level security;

drop policy if exists google_sheets_connections_admin on public.google_sheets_connections;
create policy google_sheets_connections_admin on public.google_sheets_connections
  for all using (
    gym_id in (select gym_id from public.staff_roles where user_id = auth.uid() and role in ('owner', 'admin'))
  );

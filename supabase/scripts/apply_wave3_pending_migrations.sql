-- Pending Wave 3 migrations (20250704330000 through 20250704360000)
-- Prefer: npm run db:push (after `npx supabase login`)
-- Fallback: paste this entire file into Supabase Dashboard → SQL Editor → Run

-- 20250704330000_wave3_ai_polish.sql
alter table public.ai_conversations
  add column if not exists csat_rating smallint check (csat_rating is null or (csat_rating >= 1 and csat_rating <= 5)),
  add column if not exists escalated_at timestamptz;

alter table public.gyms
  add column if not exists digest_inactive_days integer not null default 14,
  add column if not exists ai_off_hours_message text;

-- 20250704340000_wave3_complete.sql
alter table public.gyms
  add column if not exists digest_hour integer not null default 8
    check (digest_hour >= 0 and digest_hour <= 23),
  add column if not exists digest_slack_webhook_url text,
  add column if not exists ai_tone text not null default 'friendly'
    check (ai_tone in ('formal', 'friendly')),
  add column if not exists ai_languages text[] not null default array['en']::text[],
  add column if not exists digest_sections jsonb not null default '{
    "leads": true,
    "payments": true,
    "retention": true,
    "classes": true,
    "belts": true,
    "ai": true
  }'::jsonb;

create table if not exists public.gym_knowledge_versions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  knowledge_id uuid not null references public.gym_knowledge(id) on delete cascade,
  topic text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_gym_knowledge_versions_knowledge
  on public.gym_knowledge_versions(knowledge_id, created_at desc);

create table if not exists public.digest_action_states (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  action_key text not null,
  status text not null check (status in ('done', 'snoozed')),
  snooze_until date,
  updated_at timestamptz not null default now(),
  unique (gym_id, action_key)
);

create index if not exists idx_digest_action_states_gym
  on public.digest_action_states(gym_id);

create table if not exists public.sms_opt_outs (
  gym_id uuid not null references public.gyms(id) on delete cascade,
  phone text not null,
  opted_out_at timestamptz not null default now(),
  primary key (gym_id, phone)
);

alter table public.gym_knowledge_versions enable row level security;
alter table public.digest_action_states enable row level security;
alter table public.sms_opt_outs enable row level security;

drop policy if exists gym_knowledge_versions_admin on public.gym_knowledge_versions;
create policy gym_knowledge_versions_admin on public.gym_knowledge_versions
  for all using (
    gym_id in (select gym_id from public.staff_roles where user_id = auth.uid() and role in ('owner', 'admin'))
  );

drop policy if exists digest_action_states_staff on public.digest_action_states;
create policy digest_action_states_staff on public.digest_action_states
  for all using (
    gym_id in (select gym_id from public.staff_roles where user_id = auth.uid())
  );

drop policy if exists sms_opt_outs_admin on public.sms_opt_outs;
create policy sms_opt_outs_admin on public.sms_opt_outs
  for all using (
    gym_id in (select gym_id from public.staff_roles where user_id = auth.uid() and role in ('owner', 'admin'))
  );

-- 20250704350000_post_wave3_polish.sql
alter table public.gyms
  add column if not exists digest_frequency text not null default 'daily'
    check (digest_frequency in ('daily', 'weekly')),
  add column if not exists digest_sms_enabled boolean not null default false,
  add column if not exists digest_sms_phone text;

-- 20250704360000_import_queue_sheets_oauth.sql
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

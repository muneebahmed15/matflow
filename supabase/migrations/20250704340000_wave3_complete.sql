-- Wave 3 complete: digest config, AI persona/tone, action states, SMS opt-outs, knowledge versions

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

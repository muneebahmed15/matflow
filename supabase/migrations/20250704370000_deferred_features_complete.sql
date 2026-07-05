-- Deferred features: telephony, metering, email/social, belts, waivers, Buffer, Connect, Printful

-- AI voice calls (9.16–9.20, 10.10)
create table if not exists public.ai_voice_calls (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  call_sid text unique,
  from_phone text,
  to_phone text,
  status text not null default 'ringing'
    check (status in ('ringing', 'answered', 'completed', 'missed', 'voicemail', 'transferred')),
  duration_seconds integer not null default 0,
  recording_url text,
  transcription text,
  transferred boolean not null default false,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_ai_voice_calls_gym on public.ai_voice_calls(gym_id, created_at desc);

-- AI usage metering (9.51–9.52)
create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  channel text not null,
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_gym_month on public.ai_usage_events(gym_id, created_at desc);

-- Platform benchmarks (10.49)
create table if not exists public.platform_benchmarks (
  metric_key text primary key,
  p25 numeric,
  p50 numeric,
  p75 numeric,
  updated_at timestamptz not null default now()
);

insert into public.platform_benchmarks (metric_key, p25, p50, p75) values
  ('lead_conversion_rate_7d', 8, 15, 25),
  ('inactive_members_14d_pct', 5, 12, 20),
  ('class_fill_rate', 40, 55, 70)
on conflict (metric_key) do nothing;

-- Belt discipline stripes (4.44)
create table if not exists public.belt_discipline_stripes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  discipline text not null,
  stripe_count integer not null default 0 check (stripe_count >= 0 and stripe_count <= 4),
  updated_at timestamptz not null default now(),
  unique (gym_id, member_id, discipline)
);

create index if not exists idx_belt_discipline_stripes_member
  on public.belt_discipline_stripes(gym_id, member_id);

-- Waiver translations (6.10)
create table if not exists public.waiver_translations (
  id uuid primary key default gen_random_uuid(),
  waiver_id uuid not null references public.waivers(id) on delete cascade,
  locale text not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (waiver_id, locale)
);

-- Social posts / Buffer (11.31)
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  caption text not null,
  image_url text,
  scheduled_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'failed', 'cancelled')),
  buffer_post_id text,
  provider text not null default 'buffer',
  error_message text,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists idx_social_posts_schedule
  on public.social_posts(gym_id, scheduled_at)
  where status = 'scheduled';

alter table public.orders
  add column if not exists printful_order_id integer;

alter table public.belt_requirements
  add column if not exists min_competition_wins integer not null default 0,
  add column if not exists competition_bonus_attendance integer not null default 0;

alter table public.ai_messages
  add column if not exists approval_status text
    check (approval_status is null or approval_status in ('pending', 'approved', 'rejected', 'sent')),
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz;

alter table public.products
  add column if not exists fulfillment_source text not null default 'local'
    check (fulfillment_source in ('local', 'printful')),
  add column if not exists printful_variant_id text;

alter table public.gyms
  add column if not exists ai_monthly_message_limit integer not null default 1000,
  add column if not exists ai_voice_enabled boolean not null default false,
  add column if not exists ai_voice_transfer_keyword text not null default 'staff',
  add column if not exists ai_voice_record_calls boolean not null default true,
  add column if not exists staff_transfer_phone text,
  add column if not exists meta_page_id text,
  add column if not exists meta_page_access_token text,
  add column if not exists meta_verify_token text,
  add column if not exists meta_instagram_id text,
  add column if not exists inbound_email_address text,
  add column if not exists ai_email_auto_reply boolean not null default true,
  add column if not exists belt_graduation_preset text not null default 'custom'
    check (belt_graduation_preset in ('custom', 'ibjjf')),
  add column if not exists nfc_display_enabled boolean not null default false,
  add column if not exists docusign_export_enabled boolean not null default false,
  add column if not exists docusign_webhook_url text,
  add column if not exists buffer_access_token text,
  add column if not exists buffer_profile_ids jsonb not null default '[]'::jsonb,
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_onboarded boolean not null default false,
  add column if not exists printful_api_key text,
  add column if not exists printful_store_id text,
  add column if not exists voice_briefing_enabled boolean not null default false,
  add column if not exists voice_briefing_phone text;

alter table public.ai_conversations drop constraint if exists ai_conversations_channel_check;
alter table public.ai_conversations add constraint ai_conversations_channel_check
  check (channel in ('web_chat', 'sms', 'email', 'phone', 'messenger', 'instagram'));

alter table public.ai_voice_calls enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.belt_discipline_stripes enable row level security;
alter table public.waiver_translations enable row level security;
alter table public.social_posts enable row level security;

drop policy if exists ai_voice_calls_staff on public.ai_voice_calls;
create policy ai_voice_calls_staff on public.ai_voice_calls
  for all using (
    gym_id in (select gym_id from public.staff_roles where user_id = auth.uid())
  );

drop policy if exists ai_usage_events_admin on public.ai_usage_events;
create policy ai_usage_events_admin on public.ai_usage_events
  for select using (
    gym_id in (select gym_id from public.staff_roles where user_id = auth.uid() and role in ('owner', 'admin'))
  );

drop policy if exists belt_discipline_stripes_staff on public.belt_discipline_stripes;
create policy belt_discipline_stripes_staff on public.belt_discipline_stripes
  for all using (
    gym_id in (select gym_id from public.staff_roles where user_id = auth.uid())
  );

drop policy if exists waiver_translations_staff on public.waiver_translations;
create policy waiver_translations_staff on public.waiver_translations
  for all using (
    exists (
      select 1 from public.waivers w
      where w.id = waiver_translations.waiver_id
        and w.gym_id in (select gym_id from public.staff_roles where user_id = auth.uid())
    )
  );

drop policy if exists social_posts_staff on public.social_posts;
create policy social_posts_staff on public.social_posts
  for all using (
    gym_id in (select gym_id from public.staff_roles where user_id = auth.uid() and role in ('owner', 'admin'))
  );

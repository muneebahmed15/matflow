-- Competitive features: lead automation, marketing pixels, blog, GBP, SMS consent

-- Lead attribution & consent
alter table public.leads add column if not exists utm_source text;
alter table public.leads add column if not exists utm_medium text;
alter table public.leads add column if not exists utm_campaign text;
alter table public.leads add column if not exists sms_consent boolean not null default false;
alter table public.leads add column if not exists trial_date date;

-- Gym marketing settings
alter table public.gyms add column if not exists ga4_measurement_id text;
alter table public.gyms add column if not exists meta_pixel_id text;
alter table public.gyms add column if not exists google_place_id text;
alter table public.gyms add column if not exists review_checkin_threshold integer not null default 5;
alter table public.gyms add column if not exists twilio_phone text;

-- Lead automation event log
create table if not exists public.lead_automation_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  workflow text not null,
  step text not null,
  channel text not null check (channel in ('email', 'sms')),
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_automation_lead on public.lead_automation_logs(lead_id, created_at desc);

-- TCPA SMS consent log
create table if not exists public.sms_consent_log (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  phone text not null,
  lead_id uuid references public.leads(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  consented boolean not null,
  source text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sms_consent_phone on public.sms_consent_log(gym_id, phone);

-- Blog posts per gym
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  title text not null,
  slug text not null,
  excerpt text,
  body_html text not null default '',
  seo_score integer,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, slug)
);

create index if not exists idx_blog_posts_gym_status on public.blog_posts(gym_id, status, published_at desc);

-- Google Business Profile OAuth tokens
create table if not exists public.gbp_connections (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade unique,
  account_id text,
  location_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- AI conversation visitor contact for SMS follow-up
alter table public.ai_conversations add column if not exists visitor_name text;
alter table public.ai_conversations add column if not exists visitor_email text;
alter table public.ai_conversations add column if not exists visitor_phone text;
alter table public.ai_conversations add column if not exists sms_followup_sent boolean not null default false;

-- RLS
alter table public.lead_automation_logs enable row level security;
alter table public.sms_consent_log enable row level security;
alter table public.blog_posts enable row level security;
alter table public.gbp_connections enable row level security;

drop policy if exists lead_automation_logs_admin on public.lead_automation_logs;
create policy lead_automation_logs_admin on public.lead_automation_logs
  for all using (public.is_gym_admin(gym_id))
  with check (public.is_gym_admin(gym_id));

drop policy if exists sms_consent_log_admin on public.sms_consent_log;
create policy sms_consent_log_admin on public.sms_consent_log
  for all using (public.is_gym_admin(gym_id))
  with check (public.is_gym_admin(gym_id));

drop policy if exists blog_posts_staff on public.blog_posts;
create policy blog_posts_staff on public.blog_posts
  for all using (public.is_gym_staff(gym_id))
  with check (public.is_gym_staff(gym_id));

drop policy if exists blog_posts_public_read on public.blog_posts;
create policy blog_posts_public_read on public.blog_posts
  for select using (
    status = 'published'
    and exists (
      select 1 from public.gyms g
      where g.id = blog_posts.gym_id and g.website_enabled = true
    )
  );

drop policy if exists gbp_connections_admin on public.gbp_connections;
create policy gbp_connections_admin on public.gbp_connections
  for all using (public.is_gym_admin(gym_id))
  with check (public.is_gym_admin(gym_id));

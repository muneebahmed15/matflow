-- Wave 2–4: Full platform schema (migration, marketing, merch, AI, insights, public content)

-- ---------------------------------------------------------------------------
-- Import / Migration Center
-- ---------------------------------------------------------------------------
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  import_type text not null check (import_type in ('members', 'attendance', 'leads', 'classes', 'belts')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  file_name text,
  total_rows integer not null default 0,
  success_rows integer not null default 0,
  error_rows integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.import_row_errors (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_number integer not null,
  row_data jsonb,
  error_message text not null,
  created_at timestamptz not null default now()
);

alter table public.members add column if not exists external_id text;
create unique index if not exists idx_members_gym_external_id
  on public.members(gym_id, external_id) where external_id is not null;

-- ---------------------------------------------------------------------------
-- Public website content
-- ---------------------------------------------------------------------------
create table if not exists public.gym_programs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  description text,
  age_group text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.gym_coaches (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  staff_role_id uuid references public.staff_roles(id) on delete set null,
  name text not null,
  bio text,
  photo_url text,
  belt_rank text,
  specialties text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.gym_reviews (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  author_name text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  body text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.gym_gallery (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Marketing
-- ---------------------------------------------------------------------------
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  subject text not null,
  body_html text not null,
  audience text not null default 'all_members'
    check (audience in ('all_members', 'active_members', 'inactive_members', 'leads', 'past_due')),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sent', 'cancelled')),
  sent_count integer not null default 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  sent_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Merchandise
-- ---------------------------------------------------------------------------
alter table public.gyms add column if not exists store_enabled boolean not null default false;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  description text,
  sku text,
  price_cents integer not null check (price_cents >= 0),
  category text not null default 'apparel',
  image_url text,
  inventory_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded')),
  total_cents integer not null default 0,
  stripe_payment_intent_id text,
  customer_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AI Front Desk
-- ---------------------------------------------------------------------------
alter table public.gyms add column if not exists ai_front_desk_enabled boolean not null default false;
alter table public.gyms add column if not exists ai_persona_name text default 'Front Desk';

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  channel text not null default 'web_chat'
    check (channel in ('web_chat', 'sms', 'email', 'phone')),
  lead_id uuid references public.leads(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  status text not null default 'open'
    check (status in ('open', 'escalated', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.gym_knowledge (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  topic text not null,
  content text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Business Assistant
-- ---------------------------------------------------------------------------
alter table public.gyms add column if not exists daily_digest_enabled boolean not null default true;

create table if not exists public.business_snapshots (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  snapshot_date date not null,
  metrics jsonb not null default '{}',
  recommendations jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (gym_id, snapshot_date)
);

-- ---------------------------------------------------------------------------
-- Multi-location & audit
-- ---------------------------------------------------------------------------
create table if not exists public.gym_locations (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  address_line1 text,
  address_city text,
  address_state text,
  address_zip text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Belt stripes history
-- ---------------------------------------------------------------------------
create table if not exists public.belt_stripe_events (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  stripe_count integer not null,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Class sessions & attendance
-- ---------------------------------------------------------------------------
create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  session_date date not null,
  instructor text,
  created_at timestamptz not null default now(),
  unique (class_id, session_date)
);

create table if not exists public.class_session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  unique (session_id, member_id)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.import_jobs enable row level security;
alter table public.import_row_errors enable row level security;
alter table public.gym_programs enable row level security;
alter table public.gym_coaches enable row level security;
alter table public.gym_reviews enable row level security;
alter table public.gym_gallery enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.review_requests enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.gym_knowledge enable row level security;
alter table public.business_snapshots enable row level security;
alter table public.gym_locations enable row level security;
alter table public.audit_events enable row level security;
alter table public.belt_stripe_events enable row level security;
alter table public.class_sessions enable row level security;
alter table public.class_session_attendance enable row level security;

-- Admin-only tables
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'import_jobs', 'email_campaigns', 'review_requests',
    'products', 'orders', 'business_snapshots', 'gym_locations', 'audit_events',
    'gym_knowledge'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', tbl || '_admin_all', tbl);
    execute format(
      'create policy %I on public.%I for all using (public.is_gym_admin(gym_id)) with check (public.is_gym_admin(gym_id))',
      tbl || '_admin_all', tbl
    );
  end loop;
end $$;

-- import_row_errors has no gym_id; scope through its parent job
drop policy if exists "import_row_errors_admin_all" on public.import_row_errors;
create policy "import_row_errors_admin_all" on public.import_row_errors
  for all using (
    exists (
      select 1 from public.import_jobs j
      where j.id = import_row_errors.job_id and public.is_gym_admin(j.gym_id)
    )
  )
  with check (
    exists (
      select 1 from public.import_jobs j
      where j.id = import_row_errors.job_id and public.is_gym_admin(j.gym_id)
    )
  );

-- Staff read/write for operational tables
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'gym_programs', 'gym_coaches', 'gym_reviews', 'gym_gallery',
    'ai_conversations', 'belt_stripe_events', 'class_sessions', 'class_session_attendance'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', tbl || '_staff_all', tbl);
    execute format(
      'create policy %I on public.%I for all using (public.is_gym_staff(gym_id)) with check (public.is_gym_staff(gym_id))',
      tbl || '_staff_all', tbl
    );
  end loop;
end $$;

-- Public read for website content when website_enabled
drop policy if exists "gym_programs_public_read" on public.gym_programs;
create policy "gym_programs_public_read" on public.gym_programs
  for select using (
    is_active = true and exists (
      select 1 from public.gyms g where g.id = gym_programs.gym_id and g.website_enabled = true
    )
  );

drop policy if exists "gym_coaches_public_read" on public.gym_coaches;
create policy "gym_coaches_public_read" on public.gym_coaches
  for select using (
    is_active = true and exists (
      select 1 from public.gyms g where g.id = gym_coaches.gym_id and g.website_enabled = true
    )
  );

drop policy if exists "gym_reviews_public_read" on public.gym_reviews;
create policy "gym_reviews_public_read" on public.gym_reviews
  for select using (
    is_published = true and exists (
      select 1 from public.gyms g where g.id = gym_reviews.gym_id and g.website_enabled = true
    )
  );

drop policy if exists "gym_gallery_public_read" on public.gym_gallery;
create policy "gym_gallery_public_read" on public.gym_gallery
  for select using (
    exists (
      select 1 from public.gyms g where g.id = gym_gallery.gym_id and g.website_enabled = true
    )
  );

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (
    is_active = true and exists (
      select 1 from public.gyms g where g.id = products.gym_id and g.store_enabled = true
    )
  );

-- order_items: via orders join (staff/admin through orders policy)
drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items
  for all using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and public.is_gym_admin(o.gym_id)
    )
  );

-- ai_messages: staff via conversation gym_id
drop policy if exists "ai_messages_staff_all" on public.ai_messages;
create policy "ai_messages_staff_all" on public.ai_messages
  for all using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id and public.is_gym_staff(c.gym_id)
    )
  );

-- Anon can insert ai_messages for web chat (conversation must exist for enabled gym)
drop policy if exists "ai_messages_anon_insert" on public.ai_messages;
create policy "ai_messages_anon_insert" on public.ai_messages
  for insert with check (
    role = 'user' and exists (
      select 1 from public.ai_conversations c
      join public.gyms g on g.id = c.gym_id
      where c.id = ai_messages.conversation_id
        and g.ai_front_desk_enabled = true
        and c.channel = 'web_chat'
    )
  );

drop policy if exists "ai_conversations_anon_insert" on public.ai_conversations;
create policy "ai_conversations_anon_insert" on public.ai_conversations
  for insert with check (
    channel = 'web_chat' and exists (
      select 1 from public.gyms g
      where g.id = gym_id and g.ai_front_desk_enabled = true and g.website_enabled = true
    )
  );

drop policy if exists "ai_conversations_anon_select" on public.ai_conversations;
create policy "ai_conversations_anon_select" on public.ai_conversations
  for select using (
    channel = 'web_chat' and exists (
      select 1 from public.gyms g
      where g.id = gym_id and g.ai_front_desk_enabled = true
    )
  );

-- Wave 3: Custom domains, dunning, family billing foundation, public location read

alter table public.gyms add column if not exists custom_domain text;
create unique index if not exists idx_gyms_custom_domain
  on public.gyms(custom_domain) where custom_domain is not null;

alter table public.families add column if not exists stripe_customer_id text;

create table if not exists public.dunning_reminders (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  reminder_number integer not null check (reminder_number between 1 and 3),
  channel text not null default 'email',
  sent_at timestamptz not null default now()
);

create unique index if not exists idx_dunning_subscription_reminder
  on public.dunning_reminders(subscription_id, reminder_number)
  where subscription_id is not null;

alter table public.dunning_reminders enable row level security;

drop policy if exists dunning_reminders_admin_all on public.dunning_reminders;
create policy dunning_reminders_admin_all on public.dunning_reminders
  for all using (public.is_gym_admin(gym_id))
  with check (public.is_gym_admin(gym_id));

-- Public read gym_locations when website enabled
drop policy if exists gym_locations_public_read on public.gym_locations;
create policy gym_locations_public_read on public.gym_locations
  for select using (
    exists (
      select 1 from public.gyms g
      where g.id = gym_locations.gym_id and g.website_enabled = true
    )
  );

-- Member marketing automation logs (win-back, etc.)
create table if not exists public.member_automation_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  workflow text not null,
  step text not null,
  channel text not null check (channel in ('email', 'sms')),
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  created_at timestamptz not null default now()
);

create index if not exists idx_member_automation_member on public.member_automation_logs(member_id, created_at desc);
create index if not exists idx_member_automation_workflow on public.member_automation_logs(gym_id, workflow, created_at desc);

alter table public.member_automation_logs enable row level security;

drop policy if exists member_automation_logs_admin on public.member_automation_logs;
create policy member_automation_logs_admin on public.member_automation_logs
  for all using (public.is_gym_admin(gym_id));

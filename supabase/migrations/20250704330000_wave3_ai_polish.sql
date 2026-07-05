-- Wave 3 AI polish: CSAT, escalation, digest settings

alter table public.ai_conversations
  add column if not exists csat_rating smallint check (csat_rating is null or (csat_rating >= 1 and csat_rating <= 5)),
  add column if not exists escalated_at timestamptz;

alter table public.gyms
  add column if not exists digest_inactive_days integer not null default 14,
  add column if not exists ai_off_hours_message text;

-- Stripe webhook idempotency ledger (service-role only; no client access)
create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_stripe_webhook_events_created
  on public.stripe_webhook_events(created_at desc);

alter table public.stripe_webhook_events enable row level security;

-- No policies: only SUPABASE_SERVICE_ROLE_KEY (API routes / webhooks) may access.

-- Track optional ad spend per email campaign for ROAS reporting
alter table public.email_campaigns add column if not exists ad_spend_cents integer not null default 0;

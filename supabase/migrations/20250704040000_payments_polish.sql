-- Payments polish: plan trial periods, manual (non-Stripe) subscriptions

alter table public.plans add column if not exists trial_days integer not null default 0
  check (trial_days >= 0);
alter table public.plans add column if not exists sort_order integer not null default 0;

alter table public.subscriptions add column if not exists payment_method text not null default 'stripe'
  check (payment_method in ('stripe', 'cash', 'check', 'other'));

-- GDPR marketing consent preferences per member
alter table public.members add column if not exists marketing_email_consent boolean not null default false;
alter table public.members add column if not exists sms_marketing_consent boolean not null default false;
alter table public.members add column if not exists marketing_consent_at timestamptz;

-- Grandfather existing non-opted-out members as email marketing consent
update public.members
set marketing_email_consent = true,
    marketing_consent_at = coalesce(marketing_consent_at, now())
where email_opt_out = false and marketing_email_consent = false;

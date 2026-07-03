-- Waiver versioning, guardian (minor) signing, signature webhooks

alter table public.waivers add column if not exists version integer not null default 1;
alter table public.waivers add column if not exists updated_at timestamptz;

alter table public.waiver_signatures add column if not exists waiver_version integer not null default 1;
alter table public.waiver_signatures add column if not exists guardian_name text;

alter table public.members add column if not exists date_of_birth date;

-- Optional webhook fired when a waiver signature completes
alter table public.gyms add column if not exists signature_webhook_url text;

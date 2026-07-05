-- Post-Wave 3 polish: digest frequency/SMS, twilio phone in settings flow

alter table public.gyms
  add column if not exists digest_frequency text not null default 'daily'
    check (digest_frequency in ('daily', 'weekly')),
  add column if not exists digest_sms_enabled boolean not null default false,
  add column if not exists digest_sms_phone text;

-- WhatsApp Business Cloud API (replaces Twilio for gym text messaging)

alter table public.gyms
  add column if not exists whatsapp_enabled boolean not null default false,
  add column if not exists whatsapp_phone_number_id text,
  add column if not exists whatsapp_business_account_id text,
  add column if not exists whatsapp_display_phone text;

alter table public.ai_conversations drop constraint if exists ai_conversations_channel_check;
alter table public.ai_conversations add constraint ai_conversations_channel_check
  check (channel in ('web_chat', 'sms', 'whatsapp', 'email', 'phone', 'messenger', 'instagram'));

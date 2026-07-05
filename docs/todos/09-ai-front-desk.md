# Module 9: AI Front Desk (52 todos)

## Architecture
- [x] 9.1 `ai_conversations` table
- [x] 9.2 `ai_messages` table
- [x] 9.3 Link conversations to leads/members
- [x] 9.4 Gym-specific knowledge base document store (`ai_knowledge`)
- [x] 9.5 Feature flag per gym: ai_front_desk_enabled

## Website Chat
- [x] 9.6 Embeddable chat widget on public site
- [x] 9.7 SSE streaming responses (`/api/ai/chat/stream` + widget token streaming)
- [x] 9.8 Chat history persisted per session
- [x] 9.9 Human handoff button (contact page link)
- [x] 9.10 Business hours auto-message

## SMS
- [x] 9.11 Twilio integration (outbound follow-up SMS)
- [x] 9.12 Inbound SMS webhook (`/api/twilio/sms`)
- [x] 9.13 Outbound SMS with TCPA consent tracking (`sms_consent_log` on follow-up)
- [x] 9.14 Opt-out handling (STOP/START)
- [x] 9.15 Phone number per gym (`twilio_phone` in Settings + inbound SMS routing)

## Phone
- [x] 9.16 Twilio Voice integration (`/api/twilio/voice` + TwiML gather/transfer)
- [x] 9.17 AI answers with TTS (Twilio `<Say>` + LLM)
- [x] 9.18 Transfer to staff on keyword (`ai_voice_transfer_keyword`)
- [x] 9.19 Call recording with consent prompt (`ai_voice_record_calls`)
- [x] 9.20 Voicemail transcription (Twilio Record + transcription webhook)

## Email
- [x] 9.21 Inbound email parsing (`/api/resend/inbound`)
- [x] 9.22 AI draft reply for staff approval (`approval_status` on messages)
- [x] 9.23 Auto-reply for FAQs (`ai_email_auto_reply` + knowledge match)

## Social
- [x] 9.24 Facebook Messenger webhook (`/api/meta/webhook`)
- [x] 9.25 Instagram DM webhook (Meta webhook, shared handler)
- [x] 9.26 Unified inbox UI in dashboard (`/inbox` + AI Desk conversations + analytics)

## Knowledge Base
- [x] 9.27 Admin UI: upload gym FAQ doc (topic/content on `/ai-desk`)
- [x] 9.28 Auto-index schedule, pricing, policies (injected into LLM context)
- [x] 9.29 Versioning when settings change (`gym_knowledge_versions`)
- [x] 9.30 Block AI from inventing prices (system prompt + pricing page fallback)

## Actions
- [x] 9.31 Tool: book_free_trial → create lead
- [x] 9.32 Tool: lookup_class_schedule
- [x] 9.33 Tool: capture_lead_contact
- [x] 9.34 Tool: escalate_to_human
- [x] 9.35 Never cancel subscriptions via AI (no such tool exposed)

## Safety
- [x] 9.36 Prompt injection guardrails (system prompt boundaries)
- [x] 9.37 PII redaction in logs (`redactPii`)
- [x] 9.38 Rate limit per IP/session
- [x] 9.39 Content moderation filter (OpenAI Moderation API when key configured)
- [x] 9.40 Medical/injury disclaimer auto-insert

## CRM Integration
- [x] 9.41 Every conversation → crm_notes entry (on lead capture)
- [x] 9.42 Auto-tag lead source = ai_chat
- [x] 9.43 Staff notification on escalation

## Analytics
- [x] 9.44 Resolution rate metric (AI Desk analytics tab)
- [x] 9.45 Avg response time (AI Desk analytics tab)
- [x] 9.46 Leads captured via AI (via `createLead` + conversation link)
- [x] 9.47 CSAT thumbs up/down

## Config
- [x] 9.48 AI persona name per gym
- [x] 9.49 Tone setting (formal/friendly)
- [x] 9.50 Languages supported (Settings + LLM prompt)

## Billing
- [x] 9.51 Usage metering (`ai_usage_events` + monthly limit)
- [x] 9.52 Overage alerts (cron `/api/cron/ai-usage`)

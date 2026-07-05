# Module 9: AI Front Desk (52 todos)

## Architecture
- [x] 9.1 `ai_conversations` table
- [x] 9.2 `ai_messages` table
- [x] 9.3 Link conversations to leads/members
- [x] 9.4 Gym-specific knowledge base document store (`ai_knowledge`)
- [x] 9.5 Feature flag per gym: ai_front_desk_enabled

## Website Chat
- [x] 9.6 Embeddable chat widget on public site
- [~] 9.7 WebSocket or SSE streaming responses (HTTP polling; streaming deferred)
- [x] 9.8 Chat history persisted per session
- [x] 9.9 Human handoff button (contact page link)
- [ ] 9.10 Business hours auto-message

## SMS
- [x] 9.11 Twilio integration (outbound follow-up SMS)
- [ ] 9.12 Inbound SMS webhook
- [~] 9.13 Outbound SMS with TCPA consent tracking (STOP in message; full consent log deferred)
- [ ] 9.14 Opt-out handling (STOP)
- [ ] 9.15 Phone number per gym (subaccount)

## Phone
- [ ] 9.16 Twilio Voice integration
- [ ] 9.17 AI answers with TTS
- [ ] 9.18 Transfer to staff on keyword
- [ ] 9.19 Call recording with consent prompt
- [ ] 9.20 Voicemail transcription

## Email
- [ ] 9.21 Inbound email parsing (Resend/SendGrid)
- [ ] 9.22 AI draft reply for staff approval
- [ ] 9.23 Auto-reply for FAQs

## Social
- [ ] 9.24 Facebook Messenger webhook
- [ ] 9.25 Instagram DM webhook (Meta API)
- [~] 9.26 Unified inbox UI in dashboard (`/inbox` + AI Desk conversations tab)

## Knowledge Base
- [x] 9.27 Admin UI: upload gym FAQ doc (topic/content on `/ai-desk`)
- [x] 9.28 Auto-index schedule, pricing, policies (injected into LLM context)
- [ ] 9.29 Versioning when settings change
- [x] 9.30 Block AI from inventing prices (system prompt + pricing page fallback)

## Actions
- [x] 9.31 Tool: book_free_trial → create lead
- [x] 9.32 Tool: lookup_class_schedule
- [x] 9.33 Tool: capture_lead_contact
- [ ] 9.34 Tool: escalate_to_human
- [x] 9.35 Never cancel subscriptions via AI (no such tool exposed)

## Safety
- [x] 9.36 Prompt injection guardrails (system prompt boundaries)
- [ ] 9.37 PII redaction in logs
- [x] 9.38 Rate limit per IP/session
- [ ] 9.39 Content moderation filter
- [ ] 9.40 Medical/injury disclaimer auto-insert

## CRM Integration
- [x] 9.41 Every conversation → crm_notes entry (on lead capture)
- [x] 9.42 Auto-tag lead source = ai_chat
- [ ] 9.43 Staff notification on escalation

## Analytics
- [ ] 9.44 Resolution rate metric
- [ ] 9.45 Avg response time
- [x] 9.46 Leads captured via AI (via `createLead` + conversation link)
- [ ] 9.47 CSAT thumbs up/down

## Config
- [ ] 9.48 AI persona name per gym
- [ ] 9.49 Tone setting (formal/friendly)
- [ ] 9.50 Languages supported

## Billing
- [ ] 9.51 Usage metering (messages/minutes)
- [ ] 9.52 Overage alerts

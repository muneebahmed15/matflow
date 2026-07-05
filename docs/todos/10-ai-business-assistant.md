# Module 10: AI Business Assistant (50 todos)

## Daily Summary
- [x] 10.1 Cron job: generate morning digest per gym (`/api/cron/daily-digest`)
- [x] 10.2 Email digest to gym owner (+ all admin staff)
- [x] 10.3 In-app notification card on dashboard
- [x] 10.4 Configurable delivery time (timezone + `digest_hour`, hourly cron)
- [x] 10.5 Skip digest if no actionable items

## Metrics — Leads
- [x] 10.6 New leads count (24h / 7d)
- [x] 10.7 Leads not contacted > 48h
- [x] 10.8 Trial scheduled today
- [x] 10.9 Conversion rate trend (`leadConversionRate7d`)

## Metrics — Calls / AI
- [x] 10.10 Missed calls count (`ai_voice_calls` + digest metric)
- [x] 10.11 AI conversations needing follow-up
- [x] 10.12 Escalation queue size

## Metrics — Payments
- [x] 10.13 Failed payments count
- [x] 10.14 Past due members list
- [x] 10.15 MRR change vs last week (`mrrChangePercent` from snapshots)
- [x] 10.16 Upcoming renewals

## Metrics — Retention
- [x] 10.17 Inactive students (no check-in 14d)
- [x] 10.18 Inactive students (no check-in 30d)
- [x] 10.19 At-risk churn score (inactive 14d + active subscription)
- [x] 10.20 New members this week

## Metrics — Classes
- [x] 10.21 Low attendance classes (< 30% capacity avg)
- [x] 10.22 Cancelled classes this week
- [x] 10.23 Peak hours heatmap data (`peakHours` in metrics JSON)

## Metrics — Belts
- [x] 10.24 Students ready for promotion (rules engine)
- [x] 10.25 Belt ceremony candidates this month

## Recommendations Engine
- [x] 10.26 LLM summarizes metrics into prose (optional when `OPENAI_API_KEY` set; rule-based fallback)
- [x] 10.27 Action items with priority (P1/P2/P3)
- [x] 10.28 Suggested email to inactive member (draft in recommendation)
- [x] 10.29 Marketing tip of the day
- [x] 10.30 Never recommend without data backing

## UI
- [x] 10.31 Dashboard widget: Today's Actions
- [x] 10.32 Mark action as done / snooze (`digest_action_states`)
- [x] 10.33 Historical digest archive page (`/insights` History tab)
- [x] 10.34 Export digest PDF

## Data Pipeline
- [x] 10.35 `business_snapshots` table daily
- [x] 10.36 Idempotent snapshot per gym per day
- [x] 10.37 Backfill snapshots for charts (`backfillSnapshots`)

## Config
- [x] 10.38 Toggle which sections appear in digest (`digest_sections` in Settings)
- [x] 10.39 Threshold config (inactive days, etc.)
- [x] 10.40 Multi-admin: who receives digest (owner + admin staff emails)

## Integrations
- [x] 10.41 Push to Slack webhook (optional `digest_slack_webhook_url`)
- [x] 10.42 SMS digest option (short summary via Twilio when enabled in Settings)

## Testing
- [x] 10.43 Unit test inactive member query (recommendations engine)
- [x] 10.44 Unit test snapshot aggregation (metrics → recommendations)
- [x] 10.45 Mock LLM in tests (keyword fallback tests)

## Privacy
- [x] 10.46 No member PII in email subject lines
- [x] 10.47 Digest only to verified admin emails (owner + admin staff via auth admin API)

## Future
- [x] 10.48 Weekly vs daily digest modes
- [x] 10.49 Compare gym to anonymized benchmarks (`platform_benchmarks` + insights)
- [x] 10.50 Voice briefing (cron `/api/cron/voice-briefing` + SMS digest script)

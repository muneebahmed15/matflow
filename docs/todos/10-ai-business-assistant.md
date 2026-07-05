# Module 10: AI Business Assistant (50 todos)

## Daily Summary
- [x] 10.1 Cron job: generate morning digest per gym (`/api/cron/daily-digest`)
- [x] 10.2 Email digest to gym owner
- [x] 10.3 In-app notification card on dashboard
- [ ] 10.4 Configurable delivery time (timezone)
- [x] 10.5 Skip digest if no actionable items

## Metrics — Leads
- [x] 10.6 New leads count (24h / 7d)
- [x] 10.7 Leads not contacted > 48h
- [~] 10.8 Trial scheduled today (included in open trial leads count)
- [ ] 10.9 Conversion rate trend

## Metrics — Calls / AI
- [ ] 10.10 Missed calls count (requires telephony)
- [ ] 10.11 AI conversations needing follow-up
- [ ] 10.12 Escalation queue size

## Metrics — Payments
- [x] 10.13 Failed payments count
- [x] 10.14 Past due members list
- [ ] 10.15 MRR change vs last week
- [ ] 10.16 Upcoming renewals

## Metrics — Retention
- [x] 10.17 Inactive students (no check-in 14d)
- [x] 10.18 Inactive students (no check-in 30d)
- [ ] 10.19 At-risk churn score (heuristic)
- [ ] 10.20 New members this week

## Metrics — Classes
- [x] 10.21 Low attendance classes (< 30% capacity avg)
- [ ] 10.22 Cancelled classes this week
- [ ] 10.23 Peak hours heatmap data

## Metrics — Belts
- [x] 10.24 Students ready for promotion (rules engine)
- [ ] 10.25 Belt ceremony candidates this month

## Recommendations Engine
- [~] 10.26 LLM summarizes metrics into prose (rule-based recommendations; LLM prose deferred)
- [x] 10.27 Action items with priority (P1/P2/P3)
- [ ] 10.28 Suggested email to inactive member (draft)
- [ ] 10.29 Marketing tip of the day
- [x] 10.30 Never recommend without data backing

## UI
- [x] 10.31 Dashboard widget: Today's Actions
- [ ] 10.32 Mark action as done / snooze
- [x] 10.33 Historical digest archive page (`/insights` History tab)
- [ ] 10.34 Export digest PDF

## Data Pipeline
- [x] 10.35 `business_snapshots` table daily
- [x] 10.36 Idempotent snapshot per gym per day
- [ ] 10.37 Backfill snapshots for charts

## Config
- [ ] 10.38 Toggle which sections appear in digest
- [ ] 10.39 Threshold config (inactive days, etc.)
- [ ] 10.40 Multi-admin: who receives digest

## Integrations
- [ ] 10.41 Push to Slack webhook (optional)
- [ ] 10.42 SMS digest option (short)

## Testing
- [x] 10.43 Unit test inactive member query (recommendations engine)
- [x] 10.44 Unit test snapshot aggregation (metrics → recommendations)
- [ ] 10.45 Mock LLM in tests

## Privacy
- [x] 10.46 No member PII in email subject lines
- [~] 10.47 Digest only to verified admin emails (owner email via auth admin API)

## Future
- [ ] 10.48 Weekly vs daily digest modes
- [ ] 10.49 Compare gym to anonymized benchmarks
- [ ] 10.50 Voice briefing (audio digest)

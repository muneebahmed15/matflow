# Changelog

## Phases 1–5 completion

### Phase 1 — Security & onboarding
- Gym onboard creates owner `staff_roles` admin row
- Coach/admin RLS split on billing tables (plans write, subscriptions, leads, families, notifications, refunds)
- Proxy blocks coaches from admin dashboard routes server-side
- Backfill script for legacy owner staff roles

### Phase 2 — Unified data layer
- `services/gym.ts`, extended `members` and `waivers` services
- Server actions for member CRUD, gym settings, staff list, waiver reads
- Dashboard pages wired to actions instead of direct Supabase mutations

### Phase 3 — Stripe
- Subscription action toasts via AppUi
- Webhook retry claim test coverage

### Phase 4 — Staff & email
- Welcome email on member create (best-effort via Resend)
- Waiver-signed notification on staff-initiated sign flow
- Staff list loaded via server action

### Phase 5 — Frontend polish
- MatsFlow branding on landing page and default gym names
- Settings/staff/member-create toasts
- PageLoader on waivers, subscriptions, settings
- Auth error boundary

### Docs & tests
- Project README, CHANGELOG, updated Supabase migration docs
- Unit tests for members, gym, filter-members, webhook retry

## Prior phases (summary)

- Phase 0: Supabase SSR, API auth, middleware
- Phase 3 (initial): Stripe subscription UI, webhook idempotency ledger
- Phase 4 (initial): Staff invites via Supabase Admin + Resend
- Phase 5 (initial): AppUi toasts/confirm, error boundaries
- Phase 6: Playwright E2E, blocking CI lint

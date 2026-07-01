# MatsFlow RLS Verification Checklist

Run after applying migrations to **staging** before production cutover.

## Enforcement model: which boundary actually protects each path

matflow has two parallel authorization boundaries, and only one of them is RLS.
Knowing which one applies to a given code path matters for security review.

1. **API routes (`src/app/api/**`) and services (`src/services/**`)** — these call
   `getAdminClient()` (`src/lib/supabase/admin.ts`), which uses the
   `SUPABASE_SERVICE_ROLE_KEY` and **bypasses RLS entirely**. For these paths,
   authorization is enforced purely by application code: `requireStaffAuth`,
   `requireMemberAuth`, `assertGymScope`, `assertSubscriptionInGym`, and the
   per-route Zod schemas in `src/lib/api-schemas.ts`. If one of those checks has a
   bug, RLS will **not** catch it — the admin client would still let the query
   through.
2. **Direct client-side Supabase queries** (components calling `supabase.from(...)`
   with the public anon key, e.g. `DashboardLayoutClient`, `attendance/check-in`,
   `plans`, `subscriptions`) — these run as the authenticated browser session and
   **are** subject to RLS. The policies below (`members_staff_all`,
   `members_select_self`, `subscriptions_member_select`, etc.) are the actual
   enforcement for these paths.

Rule of thumb: grep the code path for `getAdminClient()` vs `supabase.from(...)`
(anon client) to know which model applies before assuming RLS is a safety net.

## Setup

1. Apply migrations:
   ```bash
   supabase db push
   # or paste SQL from supabase/migrations/ into Supabase SQL editor
   ```
2. Run backfill:
   ```bash
   psql $DATABASE_URL -f supabase/scripts/backfill_auth_user_id.sql
   ```
3. Create test users in Supabase Auth (or use local stack):
   - `owner@test.com` — gym owner
   - `coach@test.com` — coach staff role
   - `member@test.com` — member portal user
   - Anonymous (no session) — kiosk/anon tests

## Matrix

| # | Actor | Action | Resource | Expected | Pass |
|---|-------|--------|----------|----------|------|
| 1 | Owner | SELECT | Own gym row | Allow | ☐ |
| 2 | Owner | UPDATE | Own gym settings | Allow | ☐ |
| 3 | Coach | SELECT | Gym members | Allow | ☐ |
| 4 | Coach | SELECT | Gym plans | Allow (read) | ☐ |
| 5 | Coach | INSERT | Gym plans | **Deny** (admin only via app) | ☐ |
| 6 | Member | SELECT | Own member row | Allow | ☐ |
| 7 | Member | SELECT | Other gym members | **Deny** | ☐ |
| 8 | Member | SELECT | Own attendance | Allow | ☐ |
| 9 | Anon | SELECT | Kiosk gym (kiosk_enabled=true) | Allow slug lookup | ☐ |
| 10 | Anon | SELECT | Full member roster (kiosk_enabled=false) | **Deny** | ☐ |
| 11 | Owner Gym A | SELECT | Gym B members | **Deny** | ☐ |
| 12 | Owner Gym A | INSERT | Member in Gym B | **Deny** | ☐ |
| 13 | Member | INSERT | Own waiver signature | Allow | ☐ |
| 14 | Anon | POST | `/api/stripe/refund` | **401** (API auth) | ☐ |
| 15 | Anon | POST | `/api/gym/onboard` | **401** | ☐ |

## Automated integration tests

When `SUPABASE_TEST_URL` and keys are configured:

```bash
npm run test:rls
```

See `tests/rls/integration.test.ts` — skipped by default without test project credentials.

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering | | | |
| Security review | | | |

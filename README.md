# MatsFlow

Martial arts gym management — members, classes, belts, attendance, waivers, billing, and a member portal. Built with Next.js 16, Supabase, and Stripe.

## Requirements

- Node.js 20+
- Supabase project (Auth + Postgres)
- Stripe account (test mode for development)
- Resend account (required in production for staff invites and member emails)

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in Supabase and Stripe keys (see .env.example)
```

Apply database migrations (see `supabase/README.md`), then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only service role |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL for redirects (e.g. `http://localhost:3000`) |
| `RESEND_API_KEY` | Prod | Resend API key for transactional email |
| `RESEND_FROM_EMAIL` | Prod | Verified sender (e.g. `MatsFlow <onboarding@yourdomain.com>`) |
| `CRON_SECRET` | Prod | Bearer token for `/api/cron/*` routes |
| `UPSTASH_REDIS_REST_URL` | Prod | Upstash Redis REST URL for distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Prod | Upstash Redis REST token |
| `UNSUBSCRIBE_SECRET` | Prod | HMAC secret for marketing unsubscribe links |

Optional: `SUPABASE_TEST_*` vars for RLS integration tests (`npm run test:rls`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) |
| `npm run test:rls` | RLS integration tests (needs test Supabase project) |
| `npm run test:e2e` | Playwright smoke tests (build first) |
| `npm run lint` | ESLint |

## Architecture

- **Dashboard** — staff/admin UI with coach RBAC (coaches cannot access billing, leads, staff, or settings)
- **Member portal** — `/portal/*` for members to view attendance, waivers, subscriptions
- **Kiosk** — `/kiosk/[gymSlug]` self check-in when enabled in settings
- **Services** — `src/services/` business logic (server-only, uses service role)
- **Server actions** — `src/app/(dashboard)/actions.ts` for dashboard mutations and reads
- **API routes** — Stripe webhooks, attendance, email, gym onboard

## Stripe webhooks

1. In Stripe Dashboard → Developers → Webhooks, add endpoint: `https://your-domain/api/stripe/webhook`
2. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
3. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

## Cron jobs

Scheduled jobs are defined in `vercel.json` and run as `GET /api/cron/*` routes. Every route is guarded by `requireCronSecret` (`src/lib/auth/cron.ts`), which requires an `Authorization: Bearer $CRON_SECRET` header.

| Path | Schedule (UTC) | Purpose |
|------|----------------|---------|
| `/api/cron/daily-digest` | `0 13 * * *` (13:00) | Daily owner action recommendations email |
| `/api/cron/waiver-expiry-reminders` | `0 14 * * *` (14:00) | Notify members with waivers expiring within 7 days |
| `/api/cron/lead-reminders` | `0 15 * * *` (15:00) | Trial/lead follow-up reminders |
| `/api/cron/campaigns` | `0 16 * * *` (16:00) | Send due marketing campaigns |

**Setup:**

1. Generate a secret: `openssl rand -hex 32`.
2. Add it as `CRON_SECRET` in Vercel (Production + Preview) and to `.env.local` for local runs.
3. Vercel Cron automatically attaches `Authorization: Bearer $CRON_SECRET` to scheduled invocations once the env var is set — no extra wiring needed.

**Behavior without the secret:** routes return `503 CRON_SECRET is not configured`. A wrong/missing token returns `401`.

**Test locally:**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-digest
```

> Note: `vercel.json` uses daily schedules. Sub-daily cron frequency requires a Vercel Pro plan.

## Roles

| Role | Access |
|------|--------|
| **Admin** | Full dashboard including plans, subscriptions, leads, staff, settings |
| **Coach** | Members, classes, check-in, belts, waivers |
| **Member** | Portal only (own data via RLS) |

## Deploy on Vercel

### Option A — Vercel Dashboard (recommended)

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Next.js** (auto-detected; `vercel.json` is included).
3. Add environment variables (Production + Preview):

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — mark sensitive |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook endpoint |
| `NEXT_PUBLIC_APP_URL` | Production URL, e.g. `https://your-app.vercel.app` |
| `RESEND_API_KEY` | Required for staff invites / member email in prod |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `MatsFlow <onboarding@yourdomain.com>` |
| `CRON_SECRET` | Bearer token for `/api/cron/*`; cron routes return 503 until set (see [Cron jobs](#cron-jobs)) |
| `UPSTASH_REDIS_REST_URL` | Distributed rate limiting (falls back to in-memory if unset) |
| `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limiting |
| `UNSUBSCRIBE_SECRET` | HMAC secret for marketing unsubscribe links |

4. Deploy. After first deploy, set Stripe webhook URL to `https://YOUR_DOMAIN/api/stripe/webhook`.

### Option B — GitHub Actions

Add these repository secrets, then pushes to `main`/`master` deploy via `.github/workflows/vercel.yml`:

- `VERCEL_TOKEN` — from [Vercel account tokens](https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` — `vercel link` or project settings
- `VERCEL_PROJECT_ID` — project settings

Pull requests get preview deployments; pushes to `main`/`master` deploy to production.

### General

Build with all required env vars set. Run Supabase migrations before first deploy. Configure Stripe webhook URL to your production domain.

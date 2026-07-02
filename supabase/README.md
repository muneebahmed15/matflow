# Supabase migrations

SQL migrations for MatFlow live in `migrations/`.

## Quick start (local)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
npm run db:start          # start local Supabase
npm run db:sync-env       # write keys to .env.local
npm run dev
```

Reset and apply all migrations:

```bash
npm run db:reset
npm run db:sync-env
```

Generate TypeScript types after schema changes:

```bash
npm run db:types
```

## Remote project

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
npm run db:sync-env   # or paste keys from Supabase dashboard → Settings → API
```

## Apply manually (SQL Editor)

Run migrations **in order**:

1. `20250630170000_initial_schema_and_rls.sql`
2. `20250630200000_indexes_and_constraints.sql`
3. `20250630210000_stripe_webhook_events.sql`
4. `20250630220000_coach_admin_rls_split.sql`
5. `20260630192935_initial_schema.sql` (if not superseded)
6. `20250702000000_wave1_prd_foundation.sql`
7. `20250702010000_wave2_full_platform.sql`
8. `20250702020000_wave3_enterprise_payments.sql`
9. `20250702030000_wave4_scale.sql`
10. `20250702040000_wave5_portal_waivers.sql`
11. `20250702100000_competitive_features.sql`
12. `20250703000000_rbac_launch.sql`
13. `20250703010000_production_readiness.sql`

Then run backfills:

- `scripts/backfill_auth_user_id.sql`
- `scripts/backfill_owner_staff_roles.sql`

## Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service role |

In development, if `.env.local` still has placeholder values, the app falls back to standard local Supabase keys (`http://127.0.0.1:54321`).

## Health check

```bash
curl http://localhost:3000/api/health
```

Returns `database: ok` when Supabase is reachable.

## Production deploy checklist

1. Run all migrations in order (through `20250703010000_production_readiness.sql`).
2. Set required env vars: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*`, `NEXT_PUBLIC_APP_URL`.
3. Configure Stripe webhook to `/api/stripe/webhook`.
4. Verify `GET /api/health` returns `status: ok`.
5. Smoke test: staff login → check-in (waiver gate) → member portal family switch → waiver sign.
6. Optional: `SUPABASE_TEST_URL` + `SUPABASE_TEST_ANON_KEY` for `npm run test:rls`.

## RLS verification

See [RLS_CHECKLIST.md](./RLS_CHECKLIST.md).

```bash
export SUPABASE_TEST_URL=...
export SUPABASE_TEST_ANON_KEY=...
npm run test:rls
```

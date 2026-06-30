# Supabase migrations

SQL migrations for MatsFlow live in `migrations/`.

## Apply manually

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql).
2. Run migrations **in order**:
   - `migrations/20250630170000_initial_schema_and_rls.sql`
   - `migrations/20250630200000_indexes_and_constraints.sql`
3. Run backfill: `scripts/backfill_auth_user_id.sql`

## Apply with Supabase CLI

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
psql $DATABASE_URL -f supabase/scripts/backfill_auth_user_id.sql
```

## Generate TypeScript types

After linking a project:

```bash
supabase gen types typescript --linked > src/types/database.ts
```

## RLS verification

See [RLS_CHECKLIST.md](./RLS_CHECKLIST.md) for the manual matrix and sign-off template.

Automated RLS tests (optional):

```bash
export SUPABASE_TEST_URL=...
export SUPABASE_TEST_ANON_KEY=...
npm run test:rls
```

## Notes

- Row Level Security is **required** for production — browser Supabase calls rely on RLS policies.
- Service role is used only in authenticated API routes and Stripe webhooks.
- Local development: `supabase start` then use keys from `supabase status`.

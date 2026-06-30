# Supabase migrations

SQL migrations for MatsFlow live in `migrations/`.

## Apply manually

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql).
2. Run `migrations/20250630170000_initial_schema_and_rls.sql`.

## Apply with Supabase CLI

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Notes

- Migrations use `if not exists` where possible for existing databases.
- Row Level Security is **required** for production — the Next.js API routes use the service role only for webhooks and validated server operations.
- After applying, backfill member links:

```sql
update public.members m
set auth_user_id = u.id
from auth.users u
where m.auth_user_id is null and lower(m.email) = lower(u.email);
```

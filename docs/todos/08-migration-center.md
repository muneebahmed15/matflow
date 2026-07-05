# Module 8: Migration Center (50 todos)



## UI Shell

- [x] 8.1 Dashboard route `/migration`

- [x] 8.2 Migration wizard stepper component

- [x] 8.3 Import history list

- [x] 8.4 Rollback last import (admin)



## Members Import

- [x] 8.5 CSV template download

- [x] 8.6 CSV column mapping UI (interactive mapper with header aliases)

- [x] 8.7 Validate required fields

- [x] 8.8 Preview first 10 rows

- [x] 8.9 Dry-run import (no commit)

- [x] 8.10 Commit import with progress bar

- [x] 8.11 Duplicate email handling strategy (skip / update / error)

- [x] 8.12 Import error report download



## Excel / Sheets

- [x] 8.13 Parse .xlsx server-side

- [x] 8.14 Google Sheets URL import (public link → CSV export)

- [x] 8.15 OAuth for Google Sheets (optional — connect in Migration Center; public link still works)



## Attendance Import

- [x] 8.16 Historical attendance CSV format

- [x] 8.17 Map member by email or external_id

- [x] 8.18 Date parsing validation



## Waivers Import

- [x] 8.19 Upload signed PDF batch

- [x] 8.20 Link PDF to member by email

- [x] 8.21 Store in Supabase Storage



## Memberships / Billing

- [x] 8.22 Import active subscriptions metadata (subscriptions CSV import)

- [x] 8.23 Stripe customer ID mapping (`importStripeCustomerMappings`)

- [x] 8.24 Warn: cannot import card data (PCI banner on migration page)



## Photos

- [x] 8.25 Bulk member photo upload (zip)

- [x] 8.26 Filename = email.jpg convention

- [x] 8.27 Image resize on upload



## Belt History

- [x] 8.28 Import promotion history CSV

- [x] 8.29 Validate belt ranks against gym config



## Classes

- [x] 8.30 Import class schedule CSV



## Leads

- [x] 8.31 Import prospects CSV



## Data Model

- [x] 8.32 `import_jobs` table (status, type, gym_id)

- [x] 8.33 `import_rows` error log

- [x] 8.34 `external_id` on members for mapping



## Validation Engine

- [x] 8.35 Zod schemas per import type (members/leads)

- [x] 8.36 Row-level error messages

- [x] 8.37 Max rows per job limit

- [x] 8.38 Virus scan on uploads (optional — file type, size limits, PDF magic-byte check)



## Services

- [x] 8.39 `src/services/migration.ts`

- [x] 8.40 Background job processing (`queueImportJob`, cron `/api/cron/import-jobs`, payload in `import_jobs`)



## Security

- [x] 8.41 Admin-only access

- [x] 8.42 Rate limit imports
- [x] 8.43 Audit log on import commit



## East Coast MMA

- [x] 8.44 Document ECMMA-specific field mapping — [ECMMA_FIELD_MAPPING.md](../ECMMA_FIELD_MAPPING.md)

- [x] 8.45 Pilot import with real data (staging) — interactive checklist on Migration Center + [WAVE2_MIGRATION_SIGNOFF.md](../WAVE2_MIGRATION_SIGNOFF.md)

- [x] 8.46 Sign-off checklist — [WAVE2_MIGRATION_SIGNOFF.md](../WAVE2_MIGRATION_SIGNOFF.md)



## Testing

- [x] 8.47 Unit test CSV parser

- [x] 8.48 Integration test dry-run import

- [x] 8.49 Sample fixtures in `tests/fixtures/`

- [x] 8.50 Migration center empty state copy


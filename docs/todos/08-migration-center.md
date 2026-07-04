# Module 8: Migration Center (50 todos)



## UI Shell

- [x] 8.1 Dashboard route `/migration`

- [x] 8.2 Migration wizard stepper component

- [x] 8.3 Import history list

- [x] 8.4 Rollback last import (admin)



## Members Import

- [x] 8.5 CSV template download

- [~] 8.6 CSV column mapping UI (fixed column map)

- [x] 8.7 Validate required fields

- [x] 8.8 Preview first 10 rows

- [x] 8.9 Dry-run import (no commit)

- [x] 8.10 Commit import with progress bar

- [~] 8.11 Duplicate email handling strategy (service-level)

- [x] 8.12 Import error report download



## Excel / Sheets

- [ ] 8.13 Parse .xlsx server-side

- [ ] 8.14 Google Sheets URL import

- [ ] 8.15 OAuth for Google Sheets (optional)



## Attendance Import

- [x] 8.16 Historical attendance CSV format

- [x] 8.17 Map member by email or external_id

- [x] 8.18 Date parsing validation



## Waivers Import

- [ ] 8.19 Upload signed PDF batch

- [ ] 8.20 Link PDF to member by email

- [ ] 8.21 Store in Supabase Storage



## Memberships / Billing

- [ ] 8.22 Import active subscriptions metadata

- [ ] 8.23 Stripe customer ID mapping

- [ ] 8.24 Warn: cannot import card data (PCI)



## Photos

- [ ] 8.25 Bulk member photo upload (zip)

- [ ] 8.26 Filename = email.jpg convention

- [ ] 8.27 Image resize on upload



## Belt History

- [x] 8.28 Import promotion history CSV

- [x] 8.29 Validate belt ranks against gym config



## Classes

- [ ] 8.30 Import class schedule CSV



## Leads

- [x] 8.31 Import prospects CSV



## Data Model

- [x] 8.32 `import_jobs` table (status, type, gym_id)

- [x] 8.33 `import_rows` error log

- [x] 8.34 `external_id` on members for mapping



## Validation Engine

- [~] 8.35 Zod schemas per import type (members/leads)

- [x] 8.36 Row-level error messages

- [x] 8.37 Max rows per job limit

- [ ] 8.38 Virus scan on uploads (optional)



## Services

- [x] 8.39 `src/services/migration.ts`

- [ ] 8.40 Background job processing (queue)



## Security

- [x] 8.41 Admin-only access

- [ ] 8.42 Rate limit imports

- [ ] 8.43 Audit log on import commit



## East Coast MMA

- [ ] 8.44 Document ECMMA-specific field mapping

- [ ] 8.45 Pilot import with real data (staging)

- [ ] 8.46 Sign-off checklist



## Testing

- [x] 8.47 Unit test CSV parser

- [ ] 8.48 Integration test dry-run import

- [ ] 8.49 Sample fixtures in `tests/fixtures/`

- [x] 8.50 Migration center empty state copy


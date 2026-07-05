# Wave 2 Migration Sign-Off Checklist

Use this checklist before pilot import (8.45) and production cutover (8.46).

## Pre-import (staging)

- [ ] Migration SQL `20250704310000_wave2_complete.sql` applied
- [ ] Migration SQL `20250704320000_wave4_shop_complete.sql` applied (if using shop bundles)
- [ ] ECMMA field mapping reviewed — [ECMMA_FIELD_MAPPING.md](./ECMMA_FIELD_MAPPING.md)
- [ ] CSV templates downloaded and validated with dry-run
- [ ] `.xlsx` source files parse via Migration Center upload
- [ ] Google Sheets public URL import tested (optional data source)
- [ ] Duplicate email strategy chosen (skip / update / error)
- [ ] Stripe customer ID mapping tested (no card data imported)
- [ ] Signed waiver PDF batch tested (`email.pdf` naming → `waiver-imports` bucket)
- [ ] Member photo zip tested (`email.jpg` naming, resize verified)
- [ ] Import error report downloaded and reviewed
- [ ] Rollback tested on a sample import job

## Pilot import with real data (8.45)

- [ ] Staging gym created / isolated from production
- [ ] Members import committed; spot-check 10 records
- [ ] Leads, classes, attendance, belt history imported as needed
- [ ] Active subscriptions metadata imported (Stripe IDs only)
- [ ] Waiver PDFs linked to correct members by email
- [ ] Profile photos appear on member records
- [ ] Staff sign-off: operations lead
- [ ] Staff sign-off: billing admin
- [ ] Staff sign-off: gym owner

## Production sign-off (8.46)

- [ ] Production migration window scheduled
- [ ] Final dry-run matches expected row counts
- [ ] Production import committed
- [ ] Post-import audit: member count, active subs, waiver compliance
- [ ] Kiosk check-in tested with imported members
- [ ] Portal login tested for sample members
- [ ] Go-live announcement sent

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Gym owner | | | |
| MatsFlow implementer | | | |

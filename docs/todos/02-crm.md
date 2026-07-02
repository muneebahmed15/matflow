# Module 2: CRM (55 todos)

## Members
- [x] 2.1 Members table with gym_id scope (done)
- [x] 2.2 Create member with family options (done)
- [x] 2.3 List/search members dashboard (done)
- [x] 2.4 Member detail page with tabs (done)
- [ ] 2.5 Member detail uses `getCurrentStaffInfo` not owner-only lookup
- [ ] 2.6 Member soft-delete with `deleted_at`
- [ ] 2.7 Member archive status vs hard delete
- [ ] 2.8 Member photo/avatar URL field
- [ ] 2.9 Member date of birth field
- [ ] 2.10 Member gender field (optional)
- [ ] 2.11 Member address fields
- [ ] 2.12 Member tags (JSONB array)
- [ ] 2.13 Bulk member export CSV
- [ ] 2.14 Bulk member import (see Migration module)
- [ ] 2.15 Member duplicate detection by email

## Families
- [x] 2.16 Families table (done)
- [x] 2.17 Link member to family on create (done)
- [ ] 2.18 Family detail page
- [ ] 2.19 View all members in a family
- [ ] 2.20 Family billing contact designation
- [ ] 2.21 Merge duplicate families

## Parents & Guardians
- [~] 2.22 `emergency_contacts` table (Wave 1)
- [~] 2.23 CRUD emergency contacts per member
- [~] 2.24 Emergency contact: name, phone, relationship
- [ ] 2.25 Parent/guardian as primary contact flag
- [ ] 2.26 Minors require emergency contact validation
- [ ] 2.27 Portal: member can view own emergency contacts

## Leads / Prospects
- [x] 2.28 Leads table with status pipeline (done)
- [x] 2.29 Create lead form (done)
- [x] 2.30 Status filter pills (done)
- [x] 2.31 Convert lead to member (done)
- [ ] 2.32 Lead notes field editable in UI
- [ ] 2.33 Lead assignment to staff member
- [ ] 2.34 Lead source analytics dashboard
- [ ] 2.35 Public trial booking creates lead automatically
- [ ] 2.36 Lead email notification on new lead
- [ ] 2.37 Lead SMS reminder for trial

## Coaches (CRM context)
- [x] 2.38 Staff roles table (done)
- [x] 2.39 Staff invite via email (done)
- [ ] 2.40 Coach profile page (bio, photo)
- [ ] 2.41 Link coach to classes as instructor_id FK
- [ ] 2.42 Coach availability calendar

## Notes & Interactions
- [~] 2.43 `crm_notes` table (Wave 1)
- [~] 2.44 Note types: general, call, email, in-person
- [~] 2.45 Notes linked to member_id and/or lead_id
- [~] 2.46 Staff-only notes with author_id
- [~] 2.47 Member detail Notes tab
- [ ] 2.48 Lead detail Notes tab
- [ ] 2.49 Pin important notes
- [ ] 2.50 Note search across gym
- [ ] 2.51 Interaction timeline aggregates notes + attendance + payments

## Communication Log
- [x] 2.52 Notifications table (done)
- [ ] 2.53 Log outbound emails in notifications
- [ ] 2.54 Log inbound messages (AI module)
- [ ] 2.55 Unified activity feed component

## Data Quality
- [ ] 2.56 Email format validation on create
- [ ] 2.57 Phone E.164 normalization
- [ ] 2.58 Required fields configurable per gym
- [ ] 2.59 Data completeness score per member

## Permissions
- [x] 2.60 Coaches can access members (done)
- [x] 2.61 Leads admin-only (done)
- [ ] 2.62 Coach cannot delete members (optional policy)
- [ ] 2.63 Audit trail on member PII changes

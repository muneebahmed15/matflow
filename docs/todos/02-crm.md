# Module 2: CRM (55 todos)

## Members
- [x] 2.1 Members table with gym_id scope (done)
- [x] 2.2 Create member with family options (done)
- [x] 2.3 List/search members dashboard (done)
- [x] 2.4 Member detail page with tabs (done)
- [x] 2.5 Member detail uses `getCurrentStaffInfo` not owner-only lookup
- [x] 2.6 Member soft-delete with `deleted_at`
- [x] 2.7 Member archive status vs hard delete
- [x] 2.8 Member photo/avatar URL field
- [x] 2.9 Member date of birth field (used for minor waiver flow)
- [x] 2.10 Member gender field (optional)
- [x] 2.11 Member address fields
- [x] 2.12 Member tags (text[] on members, editable on member detail)
- [x] 2.13 Bulk member export CSV
- [x] 2.14 Bulk member import (see Migration module)
- [x] 2.15 Member duplicate detection by email

## Families
- [x] 2.16 Families table (done)
- [x] 2.17 Link member to family on create (done)
- [x] 2.18 Family detail page (`/families/[id]` with member list)
- [x] 2.19 View all members in a family (family detail page)
- [x] 2.20 Family billing contact designation
- [x] 2.21 Merge duplicate families

## Parents & Guardians
- [x] 2.22 `emergency_contacts` table (Wave 1)
- [x] 2.23 CRUD emergency contacts per member (MemberEmergencyContactsPanel)
- [x] 2.24 Emergency contact: name, phone, relationship
- [x] 2.25 Parent/guardian as primary contact flag (isPrimary)
- [x] 2.26 Minors require emergency contact validation
- [x] 2.27 Portal: member can view own emergency contacts (portal profile page)

## Leads / Prospects
- [x] 2.28 Leads table with status pipeline (done)
- [x] 2.29 Create lead form (done)
- [x] 2.30 Status filter pills (done)
- [x] 2.31 Convert lead to member (done)
- [x] 2.32 Lead notes field editable in UI (LeadNotesPanel on leads page)
- [x] 2.33 Lead assignment to staff member
- [x] 2.34 Lead source analytics dashboard (marketing page)
- [x] 2.35 Public trial booking creates lead automatically
- [x] 2.36 Lead email notification on new lead (lead automation welcome email)
- [x] 2.37 Lead SMS reminder for trial (Twilio, consent-gated)

## Coaches (CRM context)
- [x] 2.38 Staff roles table (done)
- [x] 2.39 Staff invite via email (done)
- [x] 2.40 Coach profile page (bio, photo via website-content / gym_coaches)
- [x] 2.41 Link coach to classes as instructor FK (`classes.instructor_staff_id`)
- [x] 2.42 Coach availability calendar

## Notes & Interactions
- [x] 2.43 `crm_notes` table (Wave 1)
- [x] 2.44 Note types: general, call, email, in-person
- [x] 2.45 Notes linked to member_id and/or lead_id
- [x] 2.46 Staff-only notes with author_id
- [x] 2.47 Member detail Notes tab
- [x] 2.48 Lead detail Notes tab (LeadNotesPanel in expanded lead row)
- [x] 2.49 Pin important notes (toggleMemberNotePinAction)
- [x] 2.50 Note search across gym
- [x] 2.51 Interaction timeline aggregates notes + attendance + promotions + waivers + subscriptions

## Communication Log
- [x] 2.52 Notifications table (done)
- [x] 2.53 Log outbound emails in notifications
- [x] 2.54 Log inbound messages (AI chat + inbound SMS → CRM notes)
- [x] 2.55 Unified activity feed component (member Timeline tab)

## Data Quality
- [x] 2.56 Email format validation on create
- [x] 2.57 Phone E.164 normalization
- [x] 2.58 Required fields configurable per gym
- [x] 2.59 Data completeness score per member

## Permissions
- [x] 2.60 Coaches can access members (done)
- [x] 2.61 Leads admin-only (done)
- [x] 2.62 Coach cannot delete members (coach lacks `members.write` capability)
- [x] 2.63 Audit trail on member PII changes

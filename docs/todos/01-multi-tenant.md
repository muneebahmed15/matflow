# Module 1: Multi-Tenant Architecture (52 todos)

## Schema & Isolation
- [ ] 1.1 Add `gyms.branding` JSONB column (logo, colors, tagline)
- [ ] 1.2 Add `gyms.website_enabled` boolean default false
- [ ] 1.3 Add `gyms.custom_domain` text nullable unique
- [x] 1.4 Add `gyms.timezone` text default 'America/New_York'
- [ ] 1.5 Add `gyms.locale` text default 'en-US'
- [ ] 1.6 Add `gym_locations` table for multi-location
- [ ] 1.7 Add `location_id` FK on classes, attendance (nullable)
- [ ] 1.8 Index `gyms.slug` for public site lookups
- [ ] 1.9 Index `gyms.custom_domain` partial where not null
- [ ] 1.10 Audit log table `audit_events` (gym_id, actor_id, action, entity, payload)

## RLS
- [ ] 1.11 RLS on `gym_locations` — staff read/write, public read if website_enabled
- [ ] 1.12 RLS on `audit_events` — admin read only
- [ ] 1.13 Policy: anon can SELECT gym row when `website_enabled = true` (slug lookup)
- [ ] 1.14 Verify cross-gym isolation in RLS integration tests
- [ ] 1.15 Document service-role bypass boundary in RLS_CHECKLIST

## Auth & Roles
- [ ] 1.16 `requireStaffSession` supports coach + admin (done — verify)
- [ ] 1.17 Admin-only routes enforced in layout (done — verify)
- [ ] 1.18 API routes use `requireStaffAuth` consistently
- [ ] 1.19 Member auth via `current_member_id()` RLS helper
- [ ] 1.20 Staff invite flow creates `staff_roles` row (done — verify)
- [ ] 1.21 Prevent removing gym owner from staff
- [ ] 1.22 Prevent coach from accessing billing tables (RLS split done)
- [ ] 1.23 Role permission matrix documented in README

## Gym Onboarding
- [ ] 1.24 `/api/gym/onboard` creates gym + owner staff role (done)
- [ ] 1.25 Slug collision handling with numeric suffix (done)
- [ ] 1.26 Default gym name from user metadata (done)
- [ ] 1.27 Onboard rollback if staff_roles insert fails (done)
- [ ] 1.28 Post-onboard redirect to dashboard setup wizard
- [ ] 1.29 Idempotent onboard — 409 if gym exists (done)

## Branding & Settings
- [~] 1.30 Settings UI: gym name, slug, kiosk (done)
- [~] 1.31 Settings UI: logo URL, primary color, tagline
- [~] 1.32 Settings UI: website enabled toggle
- [x] 1.33 Settings UI: timezone selector
- [x] 1.34 Settings UI: preview public site link
- [ ] 1.35 `updateGymSettings` service accepts branding fields
- [ ] 1.36 Validate hex color format server-side
- [ ] 1.37 Validate slug uniqueness on update

## Custom Domains
- [ ] 1.38 Store `custom_domain` on gym
- [ ] 1.39 Middleware: resolve gym from Host header
- [ ] 1.40 Vercel domain verification docs
- [ ] 1.41 Fallback to `/g/[slug]` when no custom domain

## Multi-Location
- [ ] 1.42 CRUD gym locations in settings
- [ ] 1.43 Default location on gym create
- [ ] 1.44 Filter dashboard data by location (optional)
- [ ] 1.45 Public site shows location addresses

## Observability
- [ ] 1.46 Structured logging with gym_id in all services
- [ ] 1.47 Health check includes DB connectivity
- [ ] 1.48 Rate limit per gym for public endpoints
- [ ] 1.49 Audit log on settings changes
- [x] 1.50 Audit log on staff role changes

## Enterprise / Future
- [ ] 1.51 White-label: hide MatsFlow branding flag
- [ ] 1.52 API keys table for enterprise integrations

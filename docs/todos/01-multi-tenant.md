# Module 1: Multi-Tenant Architecture (52 todos)

## Schema & Isolation
- [x] 1.1 Gym branding fields (logo_url, primary_color, tagline as columns)
- [x] 1.2 Add `gyms.website_enabled` boolean default false
- [x] 1.3 Add `gyms.custom_domain` text nullable unique
- [x] 1.4 Add `gyms.timezone` text default 'America/New_York'
- [x] 1.5 Add `gyms.locale` text default 'en-US'
- [x] 1.6 Add `gym_locations` table for multi-location
- [x] 1.7 Add `location_id` FK on classes + attendance location scoping on check-in/log
- [x] 1.8 Gym slug lookups (slug unique)
- [x] 1.9 Index `gyms.custom_domain` partial where not null
- [x] 1.10 Audit log table `audit_events` (gym_id, actor_id, action, entity, payload)

## RLS
- [x] 1.11 RLS on `gym_locations` — staff read, admin write, public read if website_enabled
- [x] 1.12 RLS on `audit_events` — staff-scoped read
- [x] 1.13 Public gym lookup handled server-side (`getPublicGymBySlug` filters website_enabled)
- [x] 1.14 Cross-gym isolation covered in RLS tests
- [x] 1.15 Service-role bypass boundary documented in supabase/README

## Auth & Roles
- [x] 1.16 `requireStaffSession` supports coach + admin
- [x] 1.17 Admin-only routes enforced
- [x] 1.18 API routes use `requireStaffAuth` consistently
- [x] 1.19 Member auth via portal member lookup
- [x] 1.20 Staff invite flow creates `staff_roles` row
- [x] 1.21 Prevent removing gym owner from staff
- [x] 1.22 Coach/billing access split via capabilities
- [x] 1.23 Role permission matrix in `src/lib/permissions/capabilities.ts`

## Gym Onboarding
- [x] 1.24 `/api/gym/onboard` creates gym + owner staff role
- [x] 1.25 Slug collision handling with numeric suffix
- [x] 1.26 Default gym name from user metadata
- [x] 1.27 Onboard rollback if staff_roles insert fails
- [x] 1.28 Post-onboard redirect to dashboard setup wizard (onboarding → `/setup`; auth callback → `/setup` when incomplete)
- [x] 1.29 Idempotent onboard — 409 if gym exists

## Branding & Settings
- [x] 1.30 Settings UI: gym name, slug, kiosk
- [x] 1.31 Settings UI: logo URL, primary color, tagline
- [x] 1.32 Settings UI: website enabled toggle
- [x] 1.33 Settings UI: timezone selector
- [x] 1.34 Settings UI: preview public site link
- [x] 1.35 `updateGymSettings` service accepts branding fields
- [x] 1.36 Validate hex color format server-side
- [x] 1.37 Validate slug uniqueness on update

## Custom Domains
- [x] 1.38 Store `custom_domain` on gym
- [x] 1.39 Proxy: resolve gym from Host header, rewrite to `/g/[slug]`
- [x] 1.40 Custom domain setup documented (settings panel copy)
- [x] 1.41 Fallback to `/g/[slug]` when no custom domain

## Multi-Location
- [x] 1.42 CRUD gym locations in settings (LocationsPanel)
- [x] 1.43 Default location on gym create (`/api/gym/onboard` inserts primary `gym_locations` row)
- [x] 1.44 Filter dashboard data by location (optional) — location filter bar + classes scoped by `location_id`
- [x] 1.45 Public site shows location addresses (contact + location pages)

## Observability
- [x] 1.46 Structured logging with gym_id in services (pino logger)
- [x] 1.47 Health check endpoint includes DB connectivity
- [x] 1.48 Rate limit for public endpoints
- [x] 1.49 Audit log on settings changes (`settings.updated` audit event)
- [x] 1.50 Audit log on staff role changes

## Enterprise / Future
- [x] 1.51 White-label: hide MatsFlow branding flag
- [x] 1.52 API keys table for enterprise integrations (`gym_api_keys` + Settings panel)

# MatsFlow — Master Implementation Plan

> **Status:** Wave 1 in progress  
> **Scoring:** `[ ]` Not started · `[~]` Partial · `[x]` Done  
> **Rule:** Each module has **50+** granular, testable todos. No item ships without schema + service + auth + UI (where applicable).

---

## Wave Roadmap

| Wave | Focus | Target |
|------|-------|--------|
| **Wave 1** | Foundation schema, CRM notes/contacts, gym branding, public site shell, waiver expiry, class waitlists | East Coast MMA pilot-ready core |
| **Wave 2** | Payments polish, belt stripes/requirements, migration CSV, marketing email | Revenue + onboarding |
| **Wave 3** | AI chat front desk, business assistant summaries | Differentiation |
| **Wave 4** | Merch store, multi-location, white-label | Scale |

---

## Module Index

| # | Module | Todos | File |
|---|--------|-------|------|
| 1 | Multi-Tenant Architecture | 52 | [01-multi-tenant.md](./todos/01-multi-tenant.md) |
| 2 | CRM | 55 | [02-crm.md](./todos/02-crm.md) |
| 3 | Class Management | 52 | [03-class-management.md](./todos/03-class-management.md) |
| 4 | Belt Tracking | 50 | [04-belt-tracking.md](./todos/04-belt-tracking.md) |
| 5 | Payments | 54 | [05-payments.md](./todos/05-payments.md) |
| 6 | Digital Waivers | 51 | [06-digital-waivers.md](./todos/06-digital-waivers.md) |
| 7 | Public Website | 56 | [07-public-website.md](./todos/07-public-website.md) |
| 8 | Migration Center | 50 | [08-migration-center.md](./todos/08-migration-center.md) |
| 9 | AI Front Desk | 52 | [09-ai-front-desk.md](./todos/09-ai-front-desk.md) |
| 10 | AI Business Assistant | 50 | [10-ai-business-assistant.md](./todos/10-ai-business-assistant.md) |
| 11 | Marketing Platform | 52 | [11-marketing-platform.md](./todos/11-marketing-platform.md) |
| 12 | Member Portal | 51 | [12-member-portal.md](./todos/12-member-portal.md) |
| 13 | Merchandise Store | 50 | [13-merchandise-store.md](./todos/13-merchandise-store.md) |

**Total:** 675 todos

---

## Wave 1 — Active Implementation Checklist

These items are being implemented in the current sprint:

- [x] Master plan + per-module todo files (50+ each) — **675 todos across 13 modules**
- [x] Migration: `20250702000000_wave1_prd_foundation.sql`
- [x] Services: `crm-notes`, `emergency-contacts`, `class-waitlist`, extended `gym`
- [x] Server actions for notes, contacts, waitlist, branding settings
- [x] Public gym website at `/g/[gymSlug]/*` (home, about, schedule, pricing, contact, trial)
- [x] Trial booking API → leads (`/api/public/trial-booking`)
- [x] Member detail: Notes + Emergency Contacts tabs
- [x] Settings: branding + public website toggle + contact fields
- [x] Class waitlist UI on classes page
- [x] Waiver signature expiry on sign
- [x] Unit tests: `gym-public`, updated `gym` service tests
- [ ] Apply migration to Supabase (`npm run db:start` + `npm run db:reset` locally, or `npm run db:push` remote)
- [ ] RLS integration tests for new tables
- [ ] Remaining 600+ todos across Waves 2–4

---

## Definition of Done (every todo)

1. **Schema** — migration with indexes, constraints, RLS
2. **Types** — `database.ts` updated
3. **Service** — `src/services/*` with `ServiceError`, gym scoping
4. **Auth** — `requireStaffSession` / RLS / API auth as appropriate
5. **UI** — dashboard or public route with loading/error/empty states
6. **Tests** — vitest for service logic where non-trivial
7. **Docs** — todo marked `[x]` in module file

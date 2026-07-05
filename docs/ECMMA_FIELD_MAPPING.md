# East Coast MMA — CSV Field Mapping

Pilot migration guide for importing data from East Coast MMA legacy systems into Matflow.

## Members

| Legacy / export column | Matflow field | Notes |
|------------------------|---------------|-------|
| First Name, FName | `first_name` | Required |
| Last Name, LName | `last_name` | Required |
| Email, E-mail | `email` | Used for duplicate detection |
| Phone, Mobile, Cell | `phone` | Normalized to E.164 on import |
| Belt, Current Belt | `belt_rank` | e.g. white, blue, purple |
| Status, Member Status | `status` | active, inactive, archived |
| Member ID, Legacy ID | `external_id` | Stable ID from old system |
| Stripe Customer ID | `stripe_customer_id` | Maps to subscription/family billing — **not** card data |

## Subscriptions / billing

| Legacy column | Matflow field | Notes |
|---------------|---------------|-------|
| Email | `email` | Must match existing member or family |
| Stripe Customer ID, cus_* | `stripe_customer_id` | Links Stripe customer for portal billing |

**PCI:** Card numbers, CVV, and expiry cannot be imported. Members re-enter payment in the member portal or Stripe Billing Portal.

## Attendance history

| Legacy column | Matflow field | Notes |
|---------------|---------------|-------|
| Email or Member ID | `email` / `external_id` | At least one required |
| Check-in Date, Date | `checked_in_at` | ISO or YYYY-MM-DD |
| Notes | `notes` | Optional |

## Belt history

| Legacy column | Matflow field | Notes |
|---------------|---------------|-------|
| Email / Member ID | `email` / `external_id` | |
| From Belt | `from_belt` | Optional |
| To Belt | `to_belt` | Required |
| Promotion Date | `promoted_at` | Required |
| Notes | `notes` | Optional |

## Class schedule

| Legacy column | Matflow field | Notes |
|---------------|---------------|-------|
| Class Name | `name` | |
| Instructor, Coach | `instructor` | Matched to staff by name |
| Day | `day_of_week` | Monday–Sunday |
| Start / End | `start_time`, `end_time` | HH:MM 24h |
| Capacity | `capacity` | Integer |
| Category | `category_tag` | e.g. BJJ, Kids |
| Color | `color` | Hex optional |
| Description | `description` | Plain text |

## Leads / trials

| Legacy column | Matflow field | Notes |
|---------------|---------------|-------|
| First / Last Name | `first_name`, `last_name` | |
| Email, Phone | `email`, `phone` | |
| Source | `source` | referral, walk-in, web |
| Notes | `notes` | |

## Shop products (manual seed)

Use **Settings → Shop** or run `node scripts/seed-ecmma-shop.mjs` with `GYM_SLUG=east-coast-mma` after migration.

Sample SKUs: academy gi (A0–A4), rash guards, patches — see `supabase/seeds/ecmma-shop.sql`.

## Recommended import order

1. Members (with `external_id`)
2. Subscriptions (Stripe customer IDs)
3. Belt history
4. Attendance history
5. Class schedule
6. Leads (optional)

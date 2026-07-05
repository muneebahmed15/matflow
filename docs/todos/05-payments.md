# Module 5: Payments (54 todos)

## Plans
- [x] 5.1 Plans table with stripe_price_id (done)
- [x] 5.2 Create plan API route (done)
- [x] 5.3 Plans dashboard UI polish
- [x] 5.4 Plan description rich text (`BlogRichTextEditor` + sanitized HTML on plans page)
- [x] 5.5 Plan trial period days (`plans.trial_days` → Stripe trial)
- [ ] 5.6 Plan setup fee
- [x] 5.7 Deactivate plan without deleting
- [x] 5.8 Plan sort order column (`plans.sort_order`)

## Checkout
- [x] 5.9 Stripe Checkout session create (done)
- [x] 5.10 Metadata: member_id, gym_id (done)
- [x] 5.11 Member portal subscribe flow (done)
- [x] 5.12 Staff-initiated checkout from member profile (done)
- [x] 5.13 Promo codes / coupons (checkout allow_promotion_codes)
- [x] 5.14 Proration on plan change
- [ ] 5.15 Tax calculation (Stripe Tax)

## Subscriptions
- [x] 5.16 Subscriptions table (done)
- [x] 5.17 Webhook: checkout.session.completed (done)
- [x] 5.18 Webhook: subscription.updated (done)
- [x] 5.19 Webhook: subscription.deleted (done)
- [x] 5.20 Webhook idempotency table (done)
- [x] 5.21 Cancel subscription API (done)
- [x] 5.22 Pause subscription API (done)
- [x] 5.23 Refund API (done)
- [x] 5.24 Subscriptions dashboard uses getCurrentStaffInfo
- [x] 5.25 Subscription detail drawer
- [x] 5.26 Manual subscription (cash/check) without Stripe

## Failed Payments
- [x] 5.27 Webhook: invoice.payment_failed (done)
- [x] 5.28 Member status → past_due (done)
- [x] 5.29 Kiosk blocks past_due check-in (done)
- [x] 5.30 Failed payment email to member (dunning service)
- [x] 5.31 Failed payment alert to admin dashboard (past-due panel on subscriptions page)
- [x] 5.32 Dunning sequence (3 reminders)
- [x] 5.33 Self-serve update payment method (Stripe Billing Portal)

## Invoices
- [x] 5.34 List invoices from Stripe per member (`/api/portal/invoices`)
- [x] 5.35 Invoice PDF download link
- [x] 5.36 Invoice history in member portal
- [x] 5.37 Admin: all invoices report

## Family Plans
- [ ] 5.38 Family subscription links multiple members
- [ ] 5.39 Family discount pricing rules
- [ ] 5.40 Single Stripe subscription for family
- [ ] 5.41 Per-member access under family plan

## Provider Abstraction
- [ ] 5.42 `PaymentProvider` interface definition
- [ ] 5.43 Stripe adapter implements interface
- [ ] 5.44 Gym-level provider config
- [ ] 5.45 Feature flag: stripe-only until v2

## Reporting
- [x] 5.46 MRR dashboard widget
- [x] 5.47 Churn rate calculation
- [x] 5.48 Revenue by plan breakdown
- [x] 5.49 Export subscriptions CSV

## Security
- [x] 5.50 Webhook signature verification (done)
- [x] 5.51 API auth on payment routes (done)
- [x] 5.52 PCI: never store card numbers (verified — Stripe Checkout/Billing Portal only, no card columns)
- [x] 5.53 Refund permission admin-only
- [x] 5.54 Audit log on refunds

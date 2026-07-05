# Module 13: Merchandise Store (50 todos)

## Catalog
- [x] 13.1 `products` table (gym_id, name, sku, price_cents)
- [x] 13.2 `product_variants` (size, color)
- [x] 13.3 `product_images` with Storage URLs (gallery_urls jsonb)
- [x] 13.4 Product categories (gis, apparel, gear)
- [x] 13.5 Product CRUD admin UI

## Inventory
- [x] 13.6 `inventory_levels` per variant (inventory_count on product + variant rows)
- [x] 13.7 Low stock alerts
- [x] 13.8 Stock adjustment log
- [x] 13.9 Reserve stock on checkout (decrement on payment via `completeShopOrder`)
- [x] 13.10 Release on payment timeout (cancel stale pending orders cron)

## Storefront
- [x] 13.11 Public store `/g/[slug]/shop`
- [x] 13.12 Product grid with filters
- [x] 13.13 Product detail page
- [x] 13.14 Cart session (localStorage per gym slug)
- [x] 13.15 Member-only vs public products flag

## Checkout
- [x] 13.16 Stripe Checkout for one-time products
- [x] 13.17 Shipping address collection
- [x] 13.18 Pick up at gym option
- [x] 13.19 Tax/shipping calculation (flat tax + member discount)
- [x] 13.20 Order confirmation email

## Orders
- [x] 13.21 `orders` table
- [x] 13.22 `order_items` table
- [x] 13.23 Order status workflow (paid, fulfilled, refunded)
- [x] 13.24 Admin order management UI
- [x] 13.25 Member order history in portal

## Fulfillment
- [x] 13.26 Mark order fulfilled
- [x] 13.27 Tracking number field
- [x] 13.28 Fulfillment notification email
- [x] 13.29 Print packing slip (PDF download)

## Discounts
- [x] 13.30 Member discount auto-apply
- [x] 13.31 Promo codes for shop (Stripe allow_promotion_codes)
- [x] 13.32 Bundle deals (gi + belt)

## Integrations
- [x] 13.33 Stripe Connect for gym payouts (`stripe-connect.ts` + onboarding link)
- [x] 13.34 Printful dropship integration (`printful.ts` + webhook + `fulfillment_source`)
- [x] 13.35 QuickBooks export (CSV)

## Reporting
- [x] 13.36 Revenue by product report
- [x] 13.37 Best sellers widget
- [x] 13.38 Inventory valuation

## Permissions
- [x] 13.39 Admin-only product management
- [x] 13.40 Coach read-only inventory (optional)

## RLS
- [x] 13.41 Members see own orders only
- [x] 13.42 Public can view active products when store_enabled

## Settings
- [x] 13.43 `gyms.store_enabled` flag
- [x] 13.44 Store policies (returns) CMS field

## Testing
- [x] 13.45 Unit test inventory decrement
- [x] 13.46 E2E: add to cart → checkout (test mode)

## Pilot
- [x] 13.47 East Coast MMA product seed data
- [x] 13.48 Gi sizing chart component
- [x] 13.49 In-gym POS mode (staff sells at desk)
- [x] 13.50 Feature flag: merchandise module off by default

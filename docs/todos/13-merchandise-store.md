# Module 13: Merchandise Store (50 todos)

## Catalog
- [x] 13.1 `products` table (gym_id, name, sku, price_cents)
- [ ] 13.2 `product_variants` (size, color)
- [ ] 13.3 `product_images` with Storage URLs
- [ ] 13.4 Product categories (gis, apparel, gear)
- [x] 13.5 Product CRUD admin UI

## Inventory
- [~] 13.6 `inventory_levels` per variant (inventory_count on product)
- [x] 13.7 Low stock alerts
- [ ] 13.8 Stock adjustment log
- [~] 13.9 Reserve stock on checkout (decrement on payment)
- [ ] 13.10 Release on payment timeout

## Storefront
- [x] 13.11 Public store `/g/[slug]/shop`
- [ ] 13.12 Product grid with filters
- [ ] 13.13 Product detail page
- [~] 13.14 Cart session (local state)
- [ ] 13.15 Member-only vs public products flag

## Checkout
- [x] 13.16 Stripe Checkout for one-time products
- [ ] 13.17 Shipping address collection
- [x] 13.18 Pick up at gym option
- [ ] 13.19 Tax/shipping calculation
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
- [ ] 13.29 Print packing slip

## Discounts
- [ ] 13.30 Member discount auto-apply
- [ ] 13.31 Promo codes for shop
- [ ] 13.32 Bundle deals (gi + belt)

## Integrations
- [ ] 13.33 Stripe Connect for gym payouts (future)
- [ ] 13.34 Printful dropship integration (future)
- [ ] 13.35 QuickBooks export

## Reporting
- [ ] 13.36 Revenue by product report
- [ ] 13.37 Best sellers widget
- [ ] 13.38 Inventory valuation

## Permissions
- [x] 13.39 Admin-only product management
- [ ] 13.40 Coach read-only inventory (optional)

## RLS
- [x] 13.41 Members see own orders only
- [x] 13.42 Public can view active products when store_enabled

## Settings
- [x] 13.43 `gyms.store_enabled` flag
- [x] 13.44 Store policies (returns) CMS field

## Testing
- [x] 13.45 Unit test inventory decrement
- [ ] 13.46 E2E: add to cart → checkout (test mode)

## Pilot
- [ ] 13.47 East Coast MMA product seed data
- [ ] 13.48 Gi sizing chart component
- [ ] 13.49 In-gym POS mode (staff sells at desk)
- [ ] 13.50 Feature flag: merchandise module off by default

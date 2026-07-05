-- Wave 2 optional + Wave 4 shop options

alter table public.gyms
  add column if not exists shop_member_discount_percent integer not null default 0,
  add column if not exists shop_flat_tax_cents integer not null default 0,
  add column if not exists coaches_stripes_only boolean not null default false;

-- store_enabled already defaults to false for new gyms (20250702010000_wave2_full_platform.sql).
-- This migration does not change existing gym rows; only new INSERTs inherit default false.

alter table public.orders
  add column if not exists shipping_address jsonb,
  add column if not exists fulfillment_type text not null default 'pickup';

alter table public.orders drop constraint if exists orders_fulfillment_type_check;
alter table public.orders
  add constraint orders_fulfillment_type_check
  check (fulfillment_type in ('pickup', 'ship'));

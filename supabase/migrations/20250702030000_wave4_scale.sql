-- Wave 4: Scale — merch checkout, white-label, class sessions polish, AI knowledge

alter table public.gyms add column if not exists white_label_enabled boolean not null default false;
alter table public.gyms add column if not exists store_return_policy text;

alter table public.orders add column if not exists stripe_checkout_session_id text;
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists fulfilled_at timestamptz;

create index if not exists idx_orders_stripe_checkout_session
  on public.orders(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- Public read gym_locations when website enabled (if not already present)
drop policy if exists gym_locations_public_read on public.gym_locations;
create policy gym_locations_public_read on public.gym_locations
  for select using (
    exists (
      select 1 from public.gyms g
      where g.id = gym_locations.gym_id and g.website_enabled = true
    )
  );

-- Members can read their own orders
drop policy if exists orders_member_select on public.orders;
create policy orders_member_select on public.orders
  for select using (
    member_id is not null and member_id = public.current_member_id()
  );

drop policy if exists order_items_member_select on public.order_items;
create policy order_items_member_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.member_id = public.current_member_id()
    )
  );

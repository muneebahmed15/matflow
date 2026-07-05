-- Wave 4 shop completion: product bundles

create table if not exists public.product_bundles (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  description text,
  bundle_price_cents integer not null check (bundle_price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_bundles_gym
  on public.product_bundles (gym_id);

create table if not exists public.product_bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.product_bundles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  unique (bundle_id, product_id)
);

create index if not exists idx_product_bundle_items_bundle
  on public.product_bundle_items (bundle_id);

alter table public.order_items
  add column if not exists bundle_id uuid references public.product_bundles(id) on delete set null;

alter table public.product_bundles enable row level security;
alter table public.product_bundle_items enable row level security;

drop policy if exists product_bundles_staff on public.product_bundles;
create policy product_bundles_staff on public.product_bundles
  for all using (public.is_gym_staff(gym_id))
  with check (public.is_gym_staff(gym_id));

drop policy if exists product_bundles_public_read on public.product_bundles;
create policy product_bundles_public_read on public.product_bundles
  for select using (
    is_active = true
    and exists (
      select 1 from public.gyms g
      where g.id = product_bundles.gym_id and g.store_enabled = true
    )
  );

drop policy if exists product_bundle_items_staff on public.product_bundle_items;
create policy product_bundle_items_staff on public.product_bundle_items
  for all using (
    exists (
      select 1 from public.product_bundles b
      where b.id = product_bundle_items.bundle_id
        and public.is_gym_staff(b.gym_id)
    )
  )
  with check (
    exists (
      select 1 from public.product_bundles b
      where b.id = product_bundle_items.bundle_id
        and public.is_gym_staff(b.gym_id)
    )
  );

drop policy if exists product_bundle_items_public_read on public.product_bundle_items;
create policy product_bundle_items_public_read on public.product_bundle_items
  for select using (
    exists (
      select 1 from public.product_bundles b
      join public.gyms g on g.id = b.gym_id
      where b.id = product_bundle_items.bundle_id
        and b.is_active = true
        and g.store_enabled = true
    )
  );

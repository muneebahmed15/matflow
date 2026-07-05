-- Wave 2 CRM completion + Wave 4 merchandise foundations

alter table public.members
  add column if not exists deleted_at timestamptz,
  add column if not exists gender text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text;

create index if not exists idx_members_gym_not_deleted
  on public.members (gym_id)
  where deleted_at is null;

alter table public.gyms
  add column if not exists member_required_fields jsonb not null default '{}'::jsonb;

alter table public.products
  add column if not exists members_only boolean not null default false,
  add column if not exists gallery_urls jsonb not null default '[]'::jsonb;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  sku text,
  price_cents integer,
  inventory_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_variants_product
  on public.product_variants (product_id);

create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  delta integer not null,
  reason text,
  actor_id uuid,
  created_at timestamptz not null default now()
);

alter table public.product_variants enable row level security;
alter table public.stock_adjustments enable row level security;

drop policy if exists product_variants_staff on public.product_variants;
create policy product_variants_staff on public.product_variants
  for all using (
    gym_id in (select gym_id from public.staff_roles where user_id = auth.uid())
  );

drop policy if exists product_variants_public_read on public.product_variants;
create policy product_variants_public_read on public.product_variants
  for select using (
    exists (
      select 1 from public.products p
      join public.gyms g on g.id = p.gym_id
      where p.id = product_variants.product_id
        and p.is_active = true
        and g.store_enabled = true
    )
  );

drop policy if exists stock_adjustments_staff on public.stock_adjustments;
create policy stock_adjustments_staff on public.stock_adjustments
  for all using (
    gym_id in (select gym_id from public.staff_roles where user_id = auth.uid())
  );

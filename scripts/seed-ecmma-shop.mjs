#!/usr/bin/env node
/**
 * Seed sample ECMMA shop products for a gym.
 * Usage: GYM_SLUG=east-coast-mma node scripts/seed-ecmma-shop.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const gymSlug = process.env.GYM_SLUG ?? 'east-coast-mma';
const admin = createClient(url, key, { auth: { persistSession: false } });

const products = [
  {
    name: 'Academy Gi — White',
    description: '<p>Pearl weave, pre-shrunk. See sizing chart on product page.</p>',
    sku: 'ECM-GI-WHT',
    price_cents: 12900,
    category: 'gis',
    inventory_count: 24,
  },
  {
    name: 'Academy Rash Guard',
    description: '<p>Long sleeve with sublimated academy logo.</p>',
    sku: 'ECM-RG-LS',
    price_cents: 4500,
    category: 'apparel',
    inventory_count: 30,
  },
  {
    name: 'ECM Patch',
    description: '<p>Embroidered academy patch for gi or bag.</p>',
    sku: 'ECM-PATCH',
    price_cents: 1200,
    category: 'gear',
    inventory_count: 50,
  },
];

const { data: gym, error: gymError } = await admin
  .from('gyms')
  .select('id, name')
  .eq('slug', gymSlug)
  .maybeSingle();

if (gymError || !gym) {
  console.error(`Gym not found for slug: ${gymSlug}`);
  process.exit(1);
}

let inserted = 0;
for (const product of products) {
  const { error } = await admin.from('products').insert({
    gym_id: gym.id,
    ...product,
    is_active: true,
    members_only: false,
    gallery_urls: [],
  });
  if (error) {
    console.warn(`Skip ${product.sku}: ${error.message}`);
  } else {
    inserted++;
  }
}

console.log(`Seeded ${inserted} products for ${gym.name} (${gymSlug})`);

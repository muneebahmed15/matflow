import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { name, description, price_cents, interval, gym_id } = await req.json();
  try {
    const product = await stripe.products.create({ name, description: description || undefined });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: price_cents,
      currency: 'usd',
      recurring: { interval },
    });
    const { error } = await supabaseAdmin.from('plans').insert({
      gym_id, name, description, price: price_cents / 100, interval,
      stripe_product_id: product.id, stripe_price_id: price.id, is_active: true,
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Create plan error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

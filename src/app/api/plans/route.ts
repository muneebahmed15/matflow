export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { name, description, price, interval, gym_id } = await req.json();

    const product = await getStripe().products.create({
      name,
      description: description || undefined,
    });

    const stripePrice = await getStripe().prices.create({
      product: product.id,
      unit_amount: Math.round(price * 100),
      currency: 'usd',
      recurring: { interval },
    });

    const { data, error } = await supabase.from('plans').insert({
      name,
      description,
      price,
      interval,
      gym_id: gym_id || null,
      stripe_price_id: stripePrice.id,
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, plan: data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
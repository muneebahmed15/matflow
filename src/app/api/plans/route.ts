import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { name, description, price, interval, gym_id } = await req.json();

    // Create a Product in Stripe
    const product = await stripe.products.create({
      name,
      description: description || undefined,
    });

    // Create a Price in Stripe
    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(price * 100), // Stripe uses cents
      currency: 'usd',
      recurring: {
        interval,
      },
    });

    // Save plan to Supabase with stripe_price_id
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
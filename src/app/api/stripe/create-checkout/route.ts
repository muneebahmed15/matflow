import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const { stripe_price_id, member_id, gym_id, member_email } = await req.json();

  if (!stripe_price_id || !member_id || !gym_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: stripe_price_id, quantity: 1 }],
      customer_email: member_email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscriptions?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscriptions?cancelled=true`,
      metadata: { member_id, gym_id },
    });
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

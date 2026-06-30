import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { stripe_subscription_id, gym_id, member_id, subscription_id, amount_cents, reason, issued_by } = await req.json();

  if (!stripe_subscription_id) {
    return NextResponse.json({ error: 'stripe_subscription_id required' }, { status: 400 });
  }

  try {
    // Get the latest invoice for this subscription to find the payment intent
    const invoices = await stripe.invoices.list({
      subscription: stripe_subscription_id,
      limit: 1,
    });

    const latestInvoice = invoices.data[0];
    if (!latestInvoice || !(latestInvoice as any).payment_intent) {
      return NextResponse.json({ error: 'No payment found to refund' }, { status: 404 });
    }

    const refund = await stripe.refunds.create({
      payment_intent: (latestInvoice as any).payment_intent as string,
      amount: amount_cents || undefined, // undefined = full refund
      reason: 'requested_by_customer',
    });

    await supabaseAdmin.from('refunds').insert({
      gym_id,
      member_id,
      subscription_id,
      stripe_refund_id: refund.id,
      amount_cents: refund.amount,
      reason: reason || null,
      issued_by: issued_by || null,
    });

    return NextResponse.json({ success: true, refund });
  } catch (err: any) {
    console.error('Refund error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

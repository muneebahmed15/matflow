import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { subscription_id, stripe_subscription_id, reason, cancel_immediately } = await req.json();

  if (!stripe_subscription_id) {
    return NextResponse.json({ error: 'stripe_subscription_id required' }, { status: 400 });
  }

  try {
    if (cancel_immediately) {
      await stripe.subscriptions.cancel(stripe_subscription_id);
    } else {
      // Cancel at end of billing period (standard, recommended)
      await stripe.subscriptions.update(stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    await supabaseAdmin.from('subscriptions').update({
      status: cancel_immediately ? 'cancelled' : 'active',
      cancellation_reason: reason || null,
      cancelled_at: new Date().toISOString(),
    }).eq('id', subscription_id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Cancel subscription error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

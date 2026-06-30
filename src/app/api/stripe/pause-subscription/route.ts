import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { subscription_id, stripe_subscription_id, reason, action } = await req.json();
  // action: 'pause' or 'resume'

  if (!stripe_subscription_id) {
    return NextResponse.json({ error: 'stripe_subscription_id required' }, { status: 400 });
  }

  try {
    if (action === 'pause') {
      await stripe.subscriptions.update(stripe_subscription_id, {
        pause_collection: { behavior: 'void' },
      });
      await supabaseAdmin.from('subscriptions').update({
        status: 'paused',
        paused_at: new Date().toISOString(),
        pause_reason: reason || null,
      }).eq('id', subscription_id);
    } else {
      await stripe.subscriptions.update(stripe_subscription_id, {
        pause_collection: '',
      });
      await supabaseAdmin.from('subscriptions').update({
        status: 'active',
        paused_at: null,
        pause_reason: null,
      }).eq('id', subscription_id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Pause subscription error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  assertSubscriptionInGym,
  isErrorResponse,
  requireStaffAuth,
} from '@/lib/auth/api';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  const { subscription_id, stripe_subscription_id, reason, cancel_immediately } =
    await req.json();

  if (!stripe_subscription_id || !subscription_id) {
    return NextResponse.json(
      { error: 'subscription_id and stripe_subscription_id required' },
      { status: 400 }
    );
  }

  const scopeError = await assertSubscriptionInGym(auth, subscription_id);
  if (scopeError) return scopeError;

  try {
    if (cancel_immediately) {
      await stripe.subscriptions.cancel(stripe_subscription_id);
    } else {
      await stripe.subscriptions.update(stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    const admin = getAdminClient();
    await admin
      .from('subscriptions')
      .update({
        status: cancel_immediately ? 'cancelled' : 'active',
        cancellation_reason: reason || null,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', subscription_id)
      .eq('gym_id', auth.gymId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cancel subscription error';
    console.error('Cancel subscription error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

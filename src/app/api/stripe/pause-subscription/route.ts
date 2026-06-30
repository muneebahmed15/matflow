import { NextRequest, NextResponse } from 'next/server';
import {
  assertSubscriptionInGym,
  isErrorResponse,
  requireStaffAuth,
} from '@/lib/auth/api';
import { isServiceError } from '@/services/errors';
import { setSubscriptionPause } from '@/services/stripe-subscriptions';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  const { subscription_id, stripe_subscription_id, reason, action } = await req.json();

  if (!stripe_subscription_id || !subscription_id) {
    return NextResponse.json(
      { error: 'subscription_id and stripe_subscription_id required' },
      { status: 400 }
    );
  }

  if (action !== 'pause' && action !== 'resume') {
    return NextResponse.json({ error: 'action must be pause or resume' }, { status: 400 });
  }

  const scopeError = await assertSubscriptionInGym(auth, subscription_id);
  if (scopeError) return scopeError;

  try {
    await setSubscriptionPause({
      gymId: auth.gymId,
      subscriptionId: subscription_id,
      stripeSubscriptionId: stripe_subscription_id,
      reason,
      action,
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Pause subscription error';
    console.error('Pause subscription error:', message);
    if (isServiceError(err)) {
      return NextResponse.json({ error: message }, { status: err.status });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

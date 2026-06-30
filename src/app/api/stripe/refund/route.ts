import { NextRequest, NextResponse } from 'next/server';
import {
  assertSubscriptionInGym,
  isErrorResponse,
  requireStaffAuth,
} from '@/lib/auth/api';
import { isServiceError } from '@/services/errors';
import { refundLatestSubscriptionPayment } from '@/services/stripe-subscriptions';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  const {
    stripe_subscription_id,
    member_id,
    subscription_id,
    amount_cents,
    reason,
  } = await req.json();

  if (!stripe_subscription_id || !subscription_id) {
    return NextResponse.json(
      { error: 'subscription_id and stripe_subscription_id required' },
      { status: 400 }
    );
  }

  const scopeError = await assertSubscriptionInGym(auth, subscription_id);
  if (scopeError) return scopeError;

  try {
    const refund = await refundLatestSubscriptionPayment({
      gymId: auth.gymId,
      subscriptionId: subscription_id,
      stripeSubscriptionId: stripe_subscription_id,
      memberId: member_id,
      amountCents: amount_cents,
      reason,
      issuedBy: auth.user.id,
    });
    return NextResponse.json({ success: true, refund });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Refund error';
    console.error('Refund error:', message);
    if (isServiceError(err)) {
      return NextResponse.json({ error: message }, { status: err.status });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

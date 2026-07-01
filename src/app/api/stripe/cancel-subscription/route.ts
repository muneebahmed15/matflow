import { NextRequest, NextResponse } from 'next/server';
import {
  assertSubscriptionInGym,
  isErrorResponse,
  requireStaffAuth,
} from '@/lib/auth/api';
import { cancelSubscription } from '@/services/stripe-subscriptions';
import { parseJsonBody } from '@/lib/api-validate';
import { cancelSubscriptionSchema } from '@/lib/api-schemas';
import { handleRouteError } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  const parsed = await parseJsonBody(req, cancelSubscriptionSchema);
  if (!parsed.success) return parsed.response;
  const { subscription_id, stripe_subscription_id, reason, cancel_immediately } = parsed.data;

  const scopeError = await assertSubscriptionInGym(auth, subscription_id);
  if (scopeError) return scopeError;

  try {
    await cancelSubscription({
      gymId: auth.gymId,
      subscriptionId: subscription_id,
      stripeSubscriptionId: stripe_subscription_id,
      reason,
      cancelImmediately: Boolean(cancel_immediately),
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Cancel subscription error',
      logMessage: 'Subscription cancellation failed',
      logContext: { subscriptionId: subscription_id, gymId: auth.gymId },
    });
  }
}

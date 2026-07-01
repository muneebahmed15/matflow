import { NextRequest, NextResponse } from 'next/server';
import {
  assertSubscriptionInGym,
  isErrorResponse,
  requireStaffAuth,
} from '@/lib/auth/api';
import { setSubscriptionPause } from '@/services/stripe-subscriptions';
import { parseJsonBody } from '@/lib/api-validate';
import { pauseSubscriptionSchema } from '@/lib/api-schemas';
import { handleRouteError } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  const parsed = await parseJsonBody(req, pauseSubscriptionSchema);
  if (!parsed.success) return parsed.response;
  const { subscription_id, stripe_subscription_id, reason, action } = parsed.data;

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
    return handleRouteError(err, {
      fallbackMessage: 'Pause subscription error',
      logMessage: 'Subscription pause/resume failed',
      logContext: { subscriptionId: subscription_id, gymId: auth.gymId, action },
    });
  }
}

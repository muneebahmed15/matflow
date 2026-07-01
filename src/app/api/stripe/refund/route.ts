import { NextRequest, NextResponse } from 'next/server';
import {
  assertSubscriptionInGym,
  isErrorResponse,
  requireStaffAuth,
} from '@/lib/auth/api';
import { refundLatestSubscriptionPayment } from '@/services/stripe-subscriptions';
import { parseJsonBody } from '@/lib/api-validate';
import { refundSchema } from '@/lib/api-schemas';
import { handleRouteError } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  const parsed = await parseJsonBody(req, refundSchema);
  if (!parsed.success) return parsed.response;
  const { stripe_subscription_id, member_id, subscription_id, amount_cents, reason } = parsed.data;

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
    return handleRouteError(err, {
      fallbackMessage: 'Refund error',
      logMessage: 'Refund failed',
      logContext: { subscriptionId: subscription_id, gymId: auth.gymId, memberId: member_id },
    });
  }
}

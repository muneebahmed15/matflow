import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { isErrorResponse } from '@/lib/auth/api';
import {
  requirePortalMemberFromRequest,
  requireBillingAccess,
} from '@/lib/auth/portal-request';
import { cancelSubscription } from '@/services/stripe-subscriptions';
import { parseJsonBody } from '@/lib/api-validate';
import { handleRouteError } from '@/lib/api-error';

const schema = z.object({
  subscription_id: z.string().uuid(),
  stripe_subscription_id: z.string().min(1),
  reason: z.string().max(2000).optional(),
  member_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.success) return parsed.response;

  const auth = await requirePortalMemberFromRequest(req, parsed.data);
  if (isErrorResponse(auth)) return auth;

  const billingDenied = requireBillingAccess(auth);
  if (billingDenied) return billingDenied;

  const admin = getAdminClient();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, gym_id, member_id, stripe_subscription_id')
    .eq('id', parsed.data.subscription_id)
    .eq('member_id', auth.memberId)
    .maybeSingle();

  if (!sub) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  try {
    await cancelSubscription({
      gymId: sub.gym_id,
      subscriptionId: sub.id,
      stripeSubscriptionId: parsed.data.stripe_subscription_id,
      reason: parsed.data.reason,
      cancelImmediately: false,
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Cancel subscription error',
      logMessage: 'Member subscription cancellation failed',
    });
  }
}

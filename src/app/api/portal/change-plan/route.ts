import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { isErrorResponse } from '@/lib/auth/api';
import {
  requirePortalMemberFromRequest,
  requireBillingAccess,
} from '@/lib/auth/portal-request';
import { changePlanSchema } from '@/lib/api-schemas';
import { parseJsonBody } from '@/lib/api-validate';
import { handleRouteError } from '@/lib/api-error';
import { changeSubscriptionPlan } from '@/services/stripe-subscriptions';

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, changePlanSchema);
  if (!parsed.success) return parsed.response;

  const auth = await requirePortalMemberFromRequest(req, parsed.data);
  if (isErrorResponse(auth)) return auth;

  const billingDenied = requireBillingAccess(auth);
  if (billingDenied) return billingDenied;

  const admin = getAdminClient();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, gym_id, member_id, stripe_subscription_id, plan_id')
    .eq('id', parsed.data.subscription_id)
    .eq('member_id', auth.memberId)
    .maybeSingle();

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  const { data: plan } = await admin
    .from('plans')
    .select('id, stripe_price_id, gym_id, is_active')
    .eq('id', parsed.data.new_plan_id)
    .eq('gym_id', sub.gym_id)
    .maybeSingle();

  if (!plan?.is_active || plan.stripe_price_id !== parsed.data.new_stripe_price_id) {
    return NextResponse.json({ error: 'Invalid plan selection' }, { status: 400 });
  }

  if (sub.plan_id === plan.id) {
    return NextResponse.json({ error: 'Already on this plan' }, { status: 400 });
  }

  try {
    await changeSubscriptionPlan({
      gymId: sub.gym_id,
      subscriptionId: sub.id,
      stripeSubscriptionId: sub.stripe_subscription_id,
      newStripePriceId: parsed.data.new_stripe_price_id,
      newPlanId: plan.id,
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Plan change failed',
      logMessage: 'Portal subscription plan change failed',
    });
  }
}

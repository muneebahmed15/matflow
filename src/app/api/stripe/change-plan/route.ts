import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  assertSubscriptionInGym,
  isErrorResponse,
  requireStaffAuth,
} from '@/lib/auth/api';
import { changePlanSchema } from '@/lib/api-schemas';
import { parseJsonBody } from '@/lib/api-validate';
import { handleRouteError } from '@/lib/api-error';
import { changeSubscriptionPlan } from '@/services/stripe-subscriptions';

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, changePlanSchema);
  if (!parsed.success) return parsed.response;

  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  const scopeError = await assertSubscriptionInGym(auth, parsed.data.subscription_id);
  if (scopeError) return scopeError;

  const admin = getAdminClient();
  const { data: plan } = await admin
    .from('plans')
    .select('id, stripe_price_id, gym_id, is_active')
    .eq('id', parsed.data.new_plan_id)
    .eq('gym_id', auth.gymId)
    .maybeSingle();

  if (!plan?.is_active || plan.stripe_price_id !== parsed.data.new_stripe_price_id) {
    return NextResponse.json({ error: 'Invalid plan selection' }, { status: 400 });
  }

  try {
    await changeSubscriptionPlan({
      gymId: auth.gymId,
      subscriptionId: parsed.data.subscription_id,
      stripeSubscriptionId: parsed.data.stripe_subscription_id,
      newStripePriceId: parsed.data.new_stripe_price_id,
      newPlanId: plan.id,
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Plan change failed',
      logMessage: 'Staff subscription plan change failed',
      logContext: { subscriptionId: parsed.data.subscription_id, gymId: auth.gymId },
    });
  }
}

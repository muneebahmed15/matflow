import { NextRequest, NextResponse } from 'next/server';
import { getPublicEnv } from '@/lib/env';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  isErrorResponse,
  requireStaffOrMemberAuth,
} from '@/lib/auth/api';
import { parseJsonBody } from '@/lib/api-validate';
import { createCheckoutSchema } from '@/lib/api-schemas';
import { handleRouteError } from '@/lib/api-error';
import { getPaymentProviderForGym } from '@/lib/payments/provider';

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, createCheckoutSchema);
  if (!parsed.success) return parsed.response;
  const { stripe_price_id, member_id, gym_id, member_email, family_id } = parsed.data;

  const access = await requireStaffOrMemberAuth({ gymId: gym_id, memberId: member_id });
  if (isErrorResponse(access)) return access;

  const admin = getAdminClient();
  const [{ data: plan }, { data: gym }] = await Promise.all([
    admin
      .from('plans')
      .select('id, trial_days, setup_fee_cents, stripe_setup_price_id')
      .eq('gym_id', gym_id)
      .eq('stripe_price_id', stripe_price_id)
      .eq('is_active', true)
      .maybeSingle(),
    admin
      .from('gyms')
      .select('stripe_tax_enabled')
      .eq('id', gym_id)
      .maybeSingle(),
  ]);

  if (!plan) {
    return NextResponse.json({ error: 'Invalid plan for this gym' }, { status: 400 });
  }

  const { NEXT_PUBLIC_APP_URL } = getPublicEnv();
  const successPath =
    access.kind === 'member'
      ? '/portal/subscription?success=true'
      : '/subscriptions?success=true';
  const cancelPath =
    access.kind === 'member'
      ? '/portal/subscription?cancelled=true'
      : '/subscriptions?cancelled=true';

  try {
    const provider = await getPaymentProviderForGym(gym_id);
    const trialDays = (plan as { trial_days?: number | null }).trial_days ?? 0;
    const setupPriceId = (plan as { stripe_setup_price_id?: string | null }).stripe_setup_price_id;

    const session = await provider.createCheckoutSession({
      gymId: gym_id,
      memberId: member_id,
      memberEmail: member_email,
      stripePriceId: stripe_price_id,
      setupFeePriceId: setupPriceId,
      trialDays,
      familyId: family_id ?? null,
      successPath,
      cancelPath,
      appUrl: NEXT_PUBLIC_APP_URL,
      automaticTax: Boolean((gym as { stripe_tax_enabled?: boolean } | null)?.stripe_tax_enabled),
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Checkout error',
      logMessage: 'Checkout session creation failed',
      logContext: { gymId: gym_id, memberId: member_id },
    });
  }
}

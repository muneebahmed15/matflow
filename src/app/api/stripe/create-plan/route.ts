import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { assertGymScope, isErrorResponse, requireStaffAuth } from '@/lib/auth/api';
import { parseJsonBody } from '@/lib/api-validate';
import { createPlanSchema } from '@/lib/api-schemas';
import { handleRouteError } from '@/lib/api-error';
import { getPaymentProviderForGym } from '@/lib/payments/provider';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  const parsed = await parseJsonBody(req, createPlanSchema);
  if (!parsed.success) return parsed.response;
  const { name, description, price_cents, interval, gym_id, setup_fee_cents } = parsed.data;

  const scopeError = assertGymScope(auth, gym_id);
  if (scopeError) return scopeError;

  try {
    const provider = await getPaymentProviderForGym(gym_id);
    const { productId, priceId, setupPriceId } = await provider.createPlanProduct({
      name,
      description: description || undefined,
      priceCents: price_cents,
      interval,
      setupFeeCents: setup_fee_cents ?? 0,
    });

    const admin = getAdminClient();
    const { error } = await admin.from('plans').insert({
      gym_id,
      name,
      description,
      price_cents,
      interval,
      stripe_product_id: productId,
      stripe_price_id: priceId,
      setup_fee_cents: setup_fee_cents ?? 0,
      stripe_setup_price_id: setupPriceId,
      is_active: true,
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Create plan error',
      logMessage: 'Plan creation failed',
      logContext: { gymId: gym_id },
    });
  }
}

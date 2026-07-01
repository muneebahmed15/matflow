import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import { assertGymScope, isErrorResponse, requireStaffAuth } from '@/lib/auth/api';
import { parseJsonBody } from '@/lib/api-validate';
import { createPlanSchema } from '@/lib/api-schemas';
import { handleRouteError } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  const parsed = await parseJsonBody(req, createPlanSchema);
  if (!parsed.success) return parsed.response;
  const { name, description, price_cents, interval, gym_id } = parsed.data;

  const scopeError = assertGymScope(auth, gym_id);
  if (scopeError) return scopeError;

  try {
    const product = await stripe.products.create({
      name,
      description: description || undefined,
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: price_cents,
      currency: 'usd',
      recurring: { interval },
    });

    const admin = getAdminClient();
    const { error } = await admin.from('plans').insert({
      gym_id,
      name,
      description,
      price_cents,
      interval,
      stripe_product_id: product.id,
      stripe_price_id: price.id,
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

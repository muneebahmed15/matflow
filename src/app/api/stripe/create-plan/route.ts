import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import { assertGymScope, isErrorResponse, requireStaffAuth } from '@/lib/auth/api';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  const { name, description, price_cents, interval, gym_id } = await req.json();

  if (!name || !price_cents || !interval || !gym_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const scopeError = assertGymScope(auth, gym_id);
  if (scopeError) return scopeError;

  if (!['month', 'year'].includes(interval)) {
    return NextResponse.json({ error: 'Invalid billing interval' }, { status: 400 });
  }

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
      price: price_cents / 100,
      interval,
      stripe_product_id: product.id,
      stripe_price_id: price.id,
      is_active: true,
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Create plan error';
    console.error('Create plan error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

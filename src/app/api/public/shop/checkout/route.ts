import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe';
import { getPublicEnv } from '@/lib/env';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  prepareShopOrder,
  attachCheckoutSessionToOrder,
} from '@/services/merchandise';
import { parseJsonBody } from '@/lib/api-validate';
import { handleRouteError } from '@/lib/api-error';

const schema = z.object({
  gym_id: z.string().uuid(),
  gym_slug: z.string().min(1),
  customer_email: z.string().email(),
  member_id: z.string().uuid().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(10),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.success) return parsed.response;

  const { gym_id, gym_slug, customer_email, member_id, items } = parsed.data;

  const admin = getAdminClient();
  const { data: gym } = await admin
    .from('gyms')
    .select('id, store_enabled, website_enabled')
    .eq('id', gym_id)
    .eq('slug', gym_slug)
    .maybeSingle();

  if (!gym?.store_enabled || !gym.website_enabled) {
    return NextResponse.json({ error: 'Store not available' }, { status: 404 });
  }

  try {
    const prepared = await prepareShopOrder({
      gymId: gym_id,
      memberId: member_id,
      customerEmail: customer_email,
      items: items.map((i) => ({ productId: i.product_id, quantity: i.quantity })),
    });

    const { NEXT_PUBLIC_APP_URL } = getPublicEnv();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email,
      line_items: prepared.lineItems.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: 'usd',
          unit_amount: line.priceCents,
          product_data: { name: line.name },
        },
      })),
      success_url: `${NEXT_PUBLIC_APP_URL}/g/${gym_slug}/shop?success=true`,
      cancel_url: `${NEXT_PUBLIC_APP_URL}/g/${gym_slug}/shop?cancelled=true`,
      metadata: {
        gym_id,
        order_id: prepared.orderId,
        type: 'merchandise',
        member_id: member_id ?? '',
      },
    });

    if (session.id) {
      await attachCheckoutSessionToOrder(gym_id, prepared.orderId, session.id);
    }

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Shop checkout error',
      logMessage: 'Shop checkout session failed',
      logContext: { gymId: gym_id },
    });
  }
}

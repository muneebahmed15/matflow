import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getPublicEnv } from '@/lib/env';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  isErrorResponse,
  requireStaffOrMemberAuth,
} from '@/lib/auth/api';

export async function POST(req: NextRequest) {
  const { stripe_price_id, member_id, gym_id, member_email } = await req.json();

  if (!stripe_price_id || !member_id || !gym_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const access = await requireStaffOrMemberAuth({ gymId: gym_id, memberId: member_id });
  if (isErrorResponse(access)) return access;

  const admin = getAdminClient();
  const { data: plan } = await admin
    .from('plans')
    .select('id')
    .eq('gym_id', gym_id)
    .eq('stripe_price_id', stripe_price_id)
    .eq('is_active', true)
    .maybeSingle();

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
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: stripe_price_id, quantity: 1 }],
      customer_email: member_email,
      success_url: `${NEXT_PUBLIC_APP_URL}${successPath}`,
      cancel_url: `${NEXT_PUBLIC_APP_URL}${cancelPath}`,
      metadata: { member_id, gym_id },
    });
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout error';
    console.error('Checkout error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';
import {
  assertSubscriptionInGym,
  isErrorResponse,
  requireStaffAuth,
} from '@/lib/auth/api';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  const {
    stripe_subscription_id,
    gym_id,
    member_id,
    subscription_id,
    amount_cents,
    reason,
    issued_by,
  } = await req.json();

  if (!stripe_subscription_id || !subscription_id) {
    return NextResponse.json(
      { error: 'subscription_id and stripe_subscription_id required' },
      { status: 400 }
    );
  }

  const scopeError = await assertSubscriptionInGym(auth, subscription_id);
  if (scopeError) return scopeError;

  if (gym_id && gym_id !== auth.gymId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const invoices = await stripe.invoices.list({
      subscription: stripe_subscription_id,
      limit: 1,
    });

    const latestInvoice = invoices.data[0] as
      | (Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null })
      | undefined;
    const paymentIntent =
      typeof latestInvoice?.payment_intent === 'string'
        ? latestInvoice.payment_intent
        : latestInvoice?.payment_intent?.id;

    if (!paymentIntent) {
      return NextResponse.json({ error: 'No payment found to refund' }, { status: 404 });
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntent,
      amount: amount_cents || undefined,
      reason: 'requested_by_customer',
    });

    const admin = getAdminClient();
    await admin.from('refunds').insert({
      gym_id: auth.gymId,
      member_id,
      subscription_id,
      stripe_refund_id: refund.id,
      amount_cents: refund.amount,
      reason: reason || null,
      issued_by: issued_by || auth.user.id,
    });

    return NextResponse.json({ success: true, refund });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Refund error';
    console.error('Refund error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

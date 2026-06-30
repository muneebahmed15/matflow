import Stripe from 'stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { ServiceError } from '@/services/errors';

export type CancelSubscriptionInput = {
  gymId: string;
  subscriptionId: string;
  stripeSubscriptionId: string;
  reason?: string;
  cancelImmediately?: boolean;
};

export async function cancelSubscription(input: CancelSubscriptionInput): Promise<void> {
  if (input.cancelImmediately) {
    await stripe.subscriptions.cancel(input.stripeSubscriptionId);
  } else {
    await stripe.subscriptions.update(input.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  const admin = getAdminClient();
  const { error } = await admin
    .from('subscriptions')
    .update({
      status: input.cancelImmediately ? 'cancelled' : 'active',
      cancellation_reason: input.reason?.trim() || null,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', input.subscriptionId)
    .eq('gym_id', input.gymId);

  if (error) throw new ServiceError(500, error.message);
}

export type PauseSubscriptionInput = {
  gymId: string;
  subscriptionId: string;
  stripeSubscriptionId: string;
  reason?: string;
  action: 'pause' | 'resume';
};

export async function setSubscriptionPause(input: PauseSubscriptionInput): Promise<void> {
  const admin = getAdminClient();

  if (input.action === 'pause') {
    await stripe.subscriptions.update(input.stripeSubscriptionId, {
      pause_collection: { behavior: 'void' },
    });
    const { error } = await admin
      .from('subscriptions')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
        pause_reason: input.reason?.trim() || null,
      })
      .eq('id', input.subscriptionId)
      .eq('gym_id', input.gymId);
    if (error) throw new ServiceError(500, error.message);
  } else {
    await stripe.subscriptions.update(input.stripeSubscriptionId, {
      pause_collection: null,
    });
    const { error } = await admin
      .from('subscriptions')
      .update({
        status: 'active',
        paused_at: null,
        pause_reason: null,
      })
      .eq('id', input.subscriptionId)
      .eq('gym_id', input.gymId);
    if (error) throw new ServiceError(500, error.message);
  }
}

function paymentIntentFromInvoice(invoice: Stripe.Invoice): string | null {
  const legacy = (invoice as Stripe.Invoice & {
    payment_intent?: string | Stripe.PaymentIntent | null;
  }).payment_intent;

  if (typeof legacy === 'string') return legacy;
  if (legacy && typeof legacy === 'object' && 'id' in legacy) return legacy.id;

  const payment = invoice.payments?.data?.[0]?.payment;
  if (!payment) return null;

  const nested = (payment as { payment_intent?: string | { id: string } }).payment_intent;
  if (typeof nested === 'string') return nested;
  if (nested && typeof nested === 'object' && 'id' in nested) return nested.id;

  return null;
}

export type RefundSubscriptionInput = {
  gymId: string;
  subscriptionId: string;
  stripeSubscriptionId: string;
  memberId?: string;
  amountCents?: number;
  reason?: string;
  issuedBy: string;
};

export async function refundLatestSubscriptionPayment(
  input: RefundSubscriptionInput
): Promise<{ refundId: string; amountCents: number }> {
  const invoices = await stripe.invoices.list({
    subscription: input.stripeSubscriptionId,
    limit: 1,
  });

  const latestInvoice = invoices.data[0];
  const paymentIntent = latestInvoice ? paymentIntentFromInvoice(latestInvoice) : null;

  if (!paymentIntent) {
    throw new ServiceError(404, 'No payment found to refund');
  }

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntent,
    amount: input.amountCents || undefined,
    reason: 'requested_by_customer',
  });

  const admin = getAdminClient();
  const { error } = await admin.from('refunds').insert({
    gym_id: input.gymId,
    member_id: input.memberId ?? null,
    subscription_id: input.subscriptionId,
    stripe_refund_id: refund.id,
    amount_cents: refund.amount,
    reason: input.reason?.trim() || null,
    issued_by: input.issuedBy,
  });

  if (error) throw new ServiceError(500, error.message);

  return { refundId: refund.id, amountCents: refund.amount };
}

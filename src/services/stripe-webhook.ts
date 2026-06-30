import Stripe from 'stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { ServiceError } from '@/services/errors';

export type WebhookClaimResult = 'claimed' | 'duplicate' | 'retry';

/** Claim a Stripe event id before processing. Returns duplicate if already processed. */
export async function claimStripeWebhookEvent(
  eventId: string,
  eventType: string
): Promise<WebhookClaimResult> {
  const admin = getAdminClient();

  const { data: existing } = await admin
    .from('stripe_webhook_events')
    .select('id, status')
    .eq('id', eventId)
    .maybeSingle();

  if (existing?.status === 'processed') {
    return 'duplicate';
  }

  if (existing?.status === 'failed') {
    await admin
      .from('stripe_webhook_events')
      .update({ status: 'processing', error_message: null })
      .eq('id', eventId);
    return 'retry';
  }

  if (existing?.status === 'processing') {
    return 'duplicate';
  }

  const { error } = await admin.from('stripe_webhook_events').insert({
    id: eventId,
    event_type: eventType,
    status: 'processing',
  });

  if (error) {
    if (error.code === '23505') return 'duplicate';
    throw new ServiceError(500, error.message);
  }

  return 'claimed';
}

export async function markStripeWebhookProcessed(eventId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('stripe_webhook_events')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', eventId);

  if (error) throw new ServiceError(500, error.message);
}

export async function markStripeWebhookFailed(
  eventId: string,
  message: string
): Promise<void> {
  const admin = getAdminClient();
  await admin
    .from('stripe_webhook_events')
    .update({
      status: 'failed',
      error_message: message.slice(0, 500),
    })
    .eq('id', eventId);
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  const admin = getAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { member_id, gym_id } = session.metadata || {};
      const stripeSubId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

      if (!member_id || !gym_id || !stripeSubId) return;

      const { data: member } = await admin
        .from('members')
        .select('id')
        .eq('id', member_id)
        .eq('gym_id', gym_id)
        .maybeSingle();
      if (!member) return;

      const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
      const priceId = stripeSub.items.data[0]?.price.id;
      const periodEnd = stripeSub.items.data[0]?.current_period_end;
      const { data: plan } = await admin
        .from('plans')
        .select('id')
        .eq('stripe_price_id', priceId)
        .eq('gym_id', gym_id)
        .maybeSingle();

      await admin.from('subscriptions').upsert(
        {
          gym_id,
          member_id,
          plan_id: plan?.id || null,
          stripe_subscription_id: stripeSubId,
          stripe_customer_id: session.customer as string,
          status: 'active',
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
        },
        { onConflict: 'stripe_subscription_id' }
      );
      await admin.from('members').update({ status: 'active' }).eq('id', member_id);
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const periodEnd = sub.items.data[0]?.current_period_end;
      await admin
        .from('subscriptions')
        .update({
          status: sub.status,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
        })
        .eq('stripe_subscription_id', sub.id);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await admin
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionRef = invoice.parent?.subscription_details?.subscription;
      const subId =
        typeof subscriptionRef === 'string'
          ? subscriptionRef
          : subscriptionRef?.id;
      if (subId) {
        await admin
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subId);
      }
      break;
    }
    default:
      break;
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import { getServerEnv } from '@/lib/env';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const { STRIPE_WEBHOOK_SECRET } = getServerEnv();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    console.error('Webhook signature error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = getAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { member_id, gym_id } = session.metadata || {};
        const stripeSubId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

        if (!member_id || !gym_id || !stripeSubId) break;

        const { data: member } = await admin
          .from('members')
          .select('id')
          .eq('id', member_id)
          .eq('gym_id', gym_id)
          .maybeSingle();
        if (!member) break;

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
          .update({ status: 'cancelled' })
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
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Handler error';
    console.error('Webhook handler error:', message);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

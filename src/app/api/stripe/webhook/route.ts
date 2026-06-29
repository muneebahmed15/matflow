import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { member_id, gym_id } = session.metadata || {};
        const stripeSubId = session.subscription as string;
        if (!member_id || !gym_id || !stripeSubId) break;
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        const priceId = stripeSub.items.data[0]?.price.id;
        const { data: plan } = await supabaseAdmin.from('plans').select('id').eq('stripe_price_id', priceId).single();
        await supabaseAdmin.from('subscriptions').upsert({
          gym_id, member_id, plan_id: plan?.id || null,
          stripe_subscription_id: stripeSubId,
          stripe_customer_id: session.customer as string,
          status: 'active',
          current_period_end: new Date((stripeSub as any).current_period_end * 1000).toISOString(),
        }, { onConflict: 'stripe_subscription_id' });
        await supabaseAdmin.from('members').update({ status: 'active' }).eq('id', member_id);
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await supabaseAdmin.from('subscriptions').update({
          status: sub.status,
          current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
        }).eq('stripe_subscription_id', sub.id);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabaseAdmin.from('subscriptions').update({ status: 'cancelled' }).eq('stripe_subscription_id', sub.id);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string;
        if (subId) await supabaseAdmin.from('subscriptions').update({ status: 'past_due' }).eq('stripe_subscription_id', subId);
        break;
      }
    }
  } catch (err: any) {
    console.error('Webhook handler error:', err.message);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServerEnv } from '@/lib/env';
import { isServiceError } from '@/services/errors';
import {
  claimStripeWebhookEvent,
  handleStripeWebhookEvent,
  markStripeWebhookFailed,
  markStripeWebhookProcessed,
} from '@/services/stripe-webhook';
import Stripe from 'stripe';

export const maxDuration = 30;
export const runtime = 'nodejs';

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

  try {
    const claim = await claimStripeWebhookEvent(event.id, event.type);
    if (claim === 'duplicate') {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await handleStripeWebhookEvent(event);
    await markStripeWebhookProcessed(event.id);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Handler error';
    console.error('Webhook handler error:', message);
    try {
      await markStripeWebhookFailed(event.id, message);
    } catch {
      // Best-effort failure marking
    }
    if (isServiceError(err)) {
      return NextResponse.json({ error: message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

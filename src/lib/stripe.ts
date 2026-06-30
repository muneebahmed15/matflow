import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('Missing STRIPE_SECRET_KEY');
    }
    stripeClient = new Stripe(key, {
      apiVersion: '2026-06-24.dahlia',
    });
  }
  return stripeClient;
}

/** @deprecated Use getStripe() — kept for existing imports during migration. */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});

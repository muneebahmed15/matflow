import { stripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type CheckoutLineItem = {
  price: string;
  quantity?: number;
};

export type CreateCheckoutInput = {
  gymId: string;
  memberId: string;
  memberEmail?: string;
  stripePriceId: string;
  setupFeePriceId?: string | null;
  trialDays?: number;
  familyId?: string | null;
  successPath: string;
  cancelPath: string;
  appUrl: string;
  automaticTax?: boolean;
};

export type PaymentProvider = {
  readonly name: string;
  createCheckoutSession(input: CreateCheckoutInput): Promise<{ url: string | null }>;
  createPlanProduct(input: {
    name: string;
    description?: string;
    priceCents: number;
    interval: 'month' | 'year';
    setupFeeCents?: number;
  }): Promise<{
    productId: string;
    priceId: string;
    setupPriceId: string | null;
  }>;
};

export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';

  async createCheckoutSession(input: CreateCheckoutInput): Promise<{ url: string | null }> {
    const lineItems: CheckoutLineItem[] = [{ price: input.stripePriceId, quantity: 1 }];
    if (input.setupFeePriceId) {
      lineItems.push({ price: input.setupFeePriceId, quantity: 1 });
    }

    const metadata: Record<string, string> = {
      member_id: input.memberId,
      gym_id: input.gymId,
    };
    if (input.familyId) metadata.family_id = input.familyId;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: input.memberEmail,
      success_url: `${input.appUrl}${input.successPath}`,
      cancel_url: `${input.appUrl}${input.cancelPath}`,
      metadata,
      allow_promotion_codes: true,
      automatic_tax: input.automaticTax ? { enabled: true } : undefined,
      ...(input.trialDays && input.trialDays > 0
        ? { subscription_data: { trial_period_days: input.trialDays } }
        : {}),
    });

    return { url: session.url };
  }

  async createPlanProduct(input: {
    name: string;
    description?: string;
    priceCents: number;
    interval: 'month' | 'year';
    setupFeeCents?: number;
  }) {
    const product = await stripe.products.create({
      name: input.name,
      description: input.description || undefined,
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: input.priceCents,
      currency: 'usd',
      recurring: { interval: input.interval },
    });

    let setupPriceId: string | null = null;
    if (input.setupFeeCents && input.setupFeeCents > 0) {
      const setupPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: input.setupFeeCents,
        currency: 'usd',
      });
      setupPriceId = setupPrice.id;
    }

    return { productId: product.id, priceId: price.id, setupPriceId };
  }
}

const stripeProvider = new StripePaymentProvider();

export async function getPaymentProviderForGym(gymId: string): Promise<PaymentProvider> {
  const admin = getAdminClient();
  const { data: gym } = await admin
    .from('gyms')
    .select('payment_provider, stripe_only')
    .eq('id', gymId)
    .maybeSingle();

  const provider = (gym as { payment_provider?: string } | null)?.payment_provider ?? 'stripe';
  const stripeOnly = (gym as { stripe_only?: boolean } | null)?.stripe_only ?? true;

  if (provider !== 'stripe') {
    throw new ServiceError(400, `Payment provider "${provider}" is not supported yet.`);
  }
  if (!stripeOnly && provider === 'stripe') {
    // stripe_only flag reserved for future multi-provider; stripe remains default
  }

  return stripeProvider;
}

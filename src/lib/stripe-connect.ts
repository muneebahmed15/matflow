import Stripe from 'stripe';
import { getServerEnv } from '@/lib/env';
import { getPublicEnv } from '@/lib/env';

function getStripe(): Stripe {
  return new Stripe(getServerEnv().STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' });
}

export async function createConnectAccountLink(input: {
  gymId: string;
  email: string;
  existingAccountId?: string | null;
}): Promise<{ accountId: string; onboardingUrl: string }> {
  const stripe = getStripe();
  const returnUrl = `${getPublicEnv().NEXT_PUBLIC_APP_URL}/settings?connect=return`;
  const refreshUrl = `${getPublicEnv().NEXT_PUBLIC_APP_URL}/settings?connect=refresh`;

  let accountId = input.existingAccountId ?? undefined;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: input.email,
      metadata: { gym_id: input.gymId },
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    });
    accountId = account.id;
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return { accountId, onboardingUrl: link.url };
}

export async function refreshConnectAccountStatus(accountId: string): Promise<boolean> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);
  return Boolean(account.charges_enabled && account.payouts_enabled);
}

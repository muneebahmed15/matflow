import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  constructEvent,
  claimStripeWebhookEvent,
  handleStripeWebhookEvent,
  markStripeWebhookFailed,
  markStripeWebhookProcessed,
} = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  claimStripeWebhookEvent: vi.fn(),
  handleStripeWebhookEvent: vi.fn(),
  markStripeWebhookFailed: vi.fn(),
  markStripeWebhookProcessed: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({ stripe: { webhooks: { constructEvent } } }));
vi.mock('@/lib/env', () => ({ getServerEnv: () => ({ STRIPE_WEBHOOK_SECRET: 'whsec_test' }) }));
vi.mock('@/services/stripe-webhook', () => ({
  claimStripeWebhookEvent,
  handleStripeWebhookEvent,
  markStripeWebhookFailed,
  markStripeWebhookProcessed,
}));

import { POST } from '@/app/api/stripe/webhook/route';
import { readJson } from './helpers';

function webhookRequest(body: string, signature: string | null) {
  const headers: Record<string, string> = {};
  if (signature) headers['stripe-signature'] = signature;
  return new Request('http://test/api/stripe/webhook', { method: 'POST', headers, body }) as unknown as NextRequest;
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    constructEvent.mockReset();
    claimStripeWebhookEvent.mockReset();
    handleStripeWebhookEvent.mockReset();
    markStripeWebhookFailed.mockReset();
    markStripeWebhookProcessed.mockReset();
  });

  it('processes a claimed event for the golden path', async () => {
    constructEvent.mockReturnValue({ id: 'evt_1', type: 'checkout.session.completed' });
    claimStripeWebhookEvent.mockResolvedValue('claimed');
    handleStripeWebhookEvent.mockResolvedValue(undefined);
    markStripeWebhookProcessed.mockResolvedValue(undefined);

    const res = await POST(webhookRequest('{}', 'valid-sig'));

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body).toEqual({ received: true });
    expect(markStripeWebhookProcessed).toHaveBeenCalledWith('evt_1');
  });

  it('rejects a request with no signature header with 400', async () => {
    const res = await POST(webhookRequest('{}', null));

    expect(res.status).toBe(400);
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it('rejects an invalid signature with 400', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('signature mismatch');
    });

    const res = await POST(webhookRequest('{}', 'bad-sig'));

    expect(res.status).toBe(400);
    expect(claimStripeWebhookEvent).not.toHaveBeenCalled();
  });

  it('short-circuits on a duplicate event', async () => {
    constructEvent.mockReturnValue({ id: 'evt_1', type: 'checkout.session.completed' });
    claimStripeWebhookEvent.mockResolvedValue('duplicate');

    const res = await POST(webhookRequest('{}', 'valid-sig'));

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body).toEqual({ received: true, duplicate: true });
    expect(handleStripeWebhookEvent).not.toHaveBeenCalled();
  });
});

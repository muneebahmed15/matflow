import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { requireStaffAuth, assertSubscriptionInGym, refundLatestSubscriptionPayment } = vi.hoisted(() => ({
  requireStaffAuth: vi.fn(),
  assertSubscriptionInGym: vi.fn(),
  refundLatestSubscriptionPayment: vi.fn(),
}));

vi.mock('@/lib/auth/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/api')>('@/lib/auth/api');
  return { ...actual, requireStaffAuth, assertSubscriptionInGym };
});

vi.mock('@/services/stripe-subscriptions', () => ({ refundLatestSubscriptionPayment }));

import { POST } from '@/app/api/stripe/refund/route';
import { jsonRequest, makeStaffAuth, readJson, VALID_MEMBER_ID, VALID_SUBSCRIPTION_ID } from './helpers';

describe('POST /api/stripe/refund', () => {
  beforeEach(() => {
    requireStaffAuth.mockReset();
    assertSubscriptionInGym.mockReset();
    refundLatestSubscriptionPayment.mockReset();
  });

  it('issues a refund for the golden path', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth());
    assertSubscriptionInGym.mockResolvedValue(null);
    refundLatestSubscriptionPayment.mockResolvedValue({ id: 're_123', amount: 5000 });

    const res = await POST(
      jsonRequest('http://test/api/stripe/refund', {
        subscription_id: VALID_SUBSCRIPTION_ID,
        stripe_subscription_id: 'sub_123',
        member_id: VALID_MEMBER_ID,
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body).toEqual({ success: true, refund: { id: 're_123', amount: 5000 } });
  });

  it('rejects a missing subscription_id with 400', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth());

    const res = await POST(
      jsonRequest('http://test/api/stripe/refund', {
        stripe_subscription_id: 'sub_123',
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(400);
    expect(refundLatestSubscriptionPayment).not.toHaveBeenCalled();
  });

  it('forbids refunding a subscription outside the staff gym', async () => {
    const { NextResponse } = await import('next/server');
    requireStaffAuth.mockResolvedValue(makeStaffAuth());
    assertSubscriptionInGym.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));

    const res = await POST(
      jsonRequest('http://test/api/stripe/refund', {
        subscription_id: VALID_SUBSCRIPTION_ID,
        stripe_subscription_id: 'sub_123',
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(403);
    expect(refundLatestSubscriptionPayment).not.toHaveBeenCalled();
  });
});

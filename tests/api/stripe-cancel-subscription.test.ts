import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const { requireStaffAuth, assertSubscriptionInGym, cancelSubscription } = vi.hoisted(() => ({
  requireStaffAuth: vi.fn(),
  assertSubscriptionInGym: vi.fn(),
  cancelSubscription: vi.fn(),
}));

vi.mock('@/lib/auth/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/api')>('@/lib/auth/api');
  return { ...actual, requireStaffAuth, assertSubscriptionInGym };
});

vi.mock('@/services/stripe-subscriptions', () => ({ cancelSubscription }));

import { POST } from '@/app/api/stripe/cancel-subscription/route';
import { jsonRequest, makeStaffAuth, readJson, VALID_GYM_ID, VALID_SUBSCRIPTION_ID } from './helpers';

describe('POST /api/stripe/cancel-subscription', () => {
  beforeEach(() => {
    requireStaffAuth.mockReset();
    assertSubscriptionInGym.mockReset();
    cancelSubscription.mockReset();
  });

  it('cancels a subscription for the golden path', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth({ gymId: VALID_GYM_ID }));
    assertSubscriptionInGym.mockResolvedValue(null);
    cancelSubscription.mockResolvedValue(undefined);

    const res = await POST(
      jsonRequest('http://test/api/stripe/cancel-subscription', {
        subscription_id: VALID_SUBSCRIPTION_ID,
        stripe_subscription_id: 'sub_123',
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body).toEqual({ success: true });
  });

  it('rejects a missing stripe_subscription_id with 400', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth({ gymId: VALID_GYM_ID }));

    const res = await POST(
      jsonRequest('http://test/api/stripe/cancel-subscription', {
        subscription_id: VALID_SUBSCRIPTION_ID,
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(400);
    expect(cancelSubscription).not.toHaveBeenCalled();
  });

  it('forbids cancelling a subscription outside the staff gym', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth({ gymId: VALID_GYM_ID }));
    assertSubscriptionInGym.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );

    const res = await POST(
      jsonRequest('http://test/api/stripe/cancel-subscription', {
        subscription_id: VALID_SUBSCRIPTION_ID,
        stripe_subscription_id: 'sub_123',
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(403);
    expect(cancelSubscription).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { requireStaffAuth, assertSubscriptionInGym, setSubscriptionPause } = vi.hoisted(() => ({
  requireStaffAuth: vi.fn(),
  assertSubscriptionInGym: vi.fn(),
  setSubscriptionPause: vi.fn(),
}));

vi.mock('@/lib/auth/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/api')>('@/lib/auth/api');
  return { ...actual, requireStaffAuth, assertSubscriptionInGym };
});

vi.mock('@/services/stripe-subscriptions', () => ({ setSubscriptionPause }));

import { POST } from '@/app/api/stripe/pause-subscription/route';
import { jsonRequest, makeStaffAuth, readJson, VALID_SUBSCRIPTION_ID } from './helpers';

describe('POST /api/stripe/pause-subscription', () => {
  beforeEach(() => {
    requireStaffAuth.mockReset();
    assertSubscriptionInGym.mockReset();
    setSubscriptionPause.mockReset();
  });

  it('pauses a subscription for the golden path', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth());
    assertSubscriptionInGym.mockResolvedValue(null);
    setSubscriptionPause.mockResolvedValue(undefined);

    const res = await POST(
      jsonRequest('http://test/api/stripe/pause-subscription', {
        subscription_id: VALID_SUBSCRIPTION_ID,
        stripe_subscription_id: 'sub_123',
        action: 'pause',
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body).toEqual({ success: true });
  });

  it('rejects an invalid action value with 400', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth());

    const res = await POST(
      jsonRequest('http://test/api/stripe/pause-subscription', {
        subscription_id: VALID_SUBSCRIPTION_ID,
        stripe_subscription_id: 'sub_123',
        action: 'delete',
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(400);
    expect(setSubscriptionPause).not.toHaveBeenCalled();
  });

  it('rejects a missing subscription id with 400 before checking auth scope', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth());

    const res = await POST(
      jsonRequest('http://test/api/stripe/pause-subscription', {
        action: 'pause',
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(400);
    expect(assertSubscriptionInGym).not.toHaveBeenCalled();
  });
});

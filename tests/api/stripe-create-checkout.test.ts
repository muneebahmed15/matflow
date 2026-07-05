import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const { requireStaffOrMemberAuth, mockFrom, createCheckoutSession } = vi.hoisted(() => ({
  requireStaffOrMemberAuth: vi.fn(),
  mockFrom: vi.fn(),
  createCheckoutSession: vi.fn(),
}));

vi.mock('@/lib/auth/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/api')>('@/lib/auth/api');
  return { ...actual, requireStaffOrMemberAuth };
});

vi.mock('@/lib/supabase/admin', () => ({ getAdminClient: () => ({ from: mockFrom }) }));
vi.mock('@/lib/env', () => ({ getPublicEnv: () => ({ NEXT_PUBLIC_APP_URL: 'http://test' }) }));
vi.mock('@/lib/payments/provider', () => ({
  getPaymentProviderForGym: vi.fn().mockResolvedValue({
    name: 'stripe',
    createCheckoutSession: (...args: unknown[]) => createCheckoutSession(...args),
  }),
}));

import { POST } from '@/app/api/stripe/create-checkout/route';
import { jsonRequest, chain, makeStaffAuth, readJson, VALID_GYM_ID, VALID_MEMBER_ID } from './helpers';

describe('POST /api/stripe/create-checkout', () => {
  beforeEach(() => {
    requireStaffOrMemberAuth.mockReset();
    mockFrom.mockReset();
    createCheckoutSession.mockReset();
  });

  it('creates a checkout session for the golden path', async () => {
    requireStaffOrMemberAuth.mockResolvedValue({ kind: 'staff', auth: makeStaffAuth({ gymId: VALID_GYM_ID }) });
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'plan-1', trial_days: 0, stripe_setup_price_id: null } }))
      .mockReturnValueOnce(chain({ data: { stripe_tax_enabled: false } }));
    createCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/session-1' });

    const res = await POST(
      jsonRequest('http://test/api/stripe/create-checkout', {
        stripe_price_id: 'price_123',
        member_id: VALID_MEMBER_ID,
        gym_id: VALID_GYM_ID,
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body).toEqual({ url: 'https://checkout.stripe.com/session-1' });
  });

  it('rejects a missing stripe_price_id with 400', async () => {
    const res = await POST(
      jsonRequest('http://test/api/stripe/create-checkout', {
        member_id: VALID_MEMBER_ID,
        gym_id: VALID_GYM_ID,
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(400);
    expect(requireStaffOrMemberAuth).not.toHaveBeenCalled();
  });

  it('propagates a 401 when unauthenticated', async () => {
    requireStaffOrMemberAuth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    const res = await POST(
      jsonRequest('http://test/api/stripe/create-checkout', {
        stripe_price_id: 'price_123',
        member_id: VALID_MEMBER_ID,
        gym_id: VALID_GYM_ID,
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(401);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });
});

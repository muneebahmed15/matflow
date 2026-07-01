import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const { requireStaffAuth, mockFrom, createProduct, createPrice } = vi.hoisted(() => ({
  requireStaffAuth: vi.fn(),
  mockFrom: vi.fn(),
  createProduct: vi.fn(),
  createPrice: vi.fn(),
}));

vi.mock('@/lib/auth/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/api')>('@/lib/auth/api');
  return { ...actual, requireStaffAuth };
});

vi.mock('@/lib/supabase/admin', () => ({ getAdminClient: () => ({ from: mockFrom }) }));
vi.mock('@/lib/stripe', () => ({
  stripe: { products: { create: createProduct }, prices: { create: createPrice } },
}));

import { POST } from '@/app/api/stripe/create-plan/route';
import { jsonRequest, chain, makeStaffAuth, readJson, VALID_GYM_ID } from './helpers';

describe('POST /api/stripe/create-plan', () => {
  beforeEach(() => {
    requireStaffAuth.mockReset();
    mockFrom.mockReset();
    createProduct.mockReset();
    createPrice.mockReset();
  });

  it('creates a plan for the golden path', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth({ gymId: VALID_GYM_ID }));
    createProduct.mockResolvedValue({ id: 'prod_1' });
    createPrice.mockResolvedValue({ id: 'price_1' });
    mockFrom.mockReturnValueOnce(chain({ error: null }));

    const res = await POST(
      jsonRequest('http://test/api/stripe/create-plan', {
        name: 'Unlimited',
        price_cents: 15000,
        interval: 'month',
        gym_id: VALID_GYM_ID,
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body).toEqual({ success: true });
  });

  it('rejects an invalid billing interval with 400', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth({ gymId: VALID_GYM_ID }));

    const res = await POST(
      jsonRequest('http://test/api/stripe/create-plan', {
        name: 'Unlimited',
        price_cents: 15000,
        interval: 'fortnight',
        gym_id: VALID_GYM_ID,
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(400);
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('forbids non-admin staff from creating a plan', async () => {
    requireStaffAuth.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );

    const res = await POST(
      jsonRequest('http://test/api/stripe/create-plan', {
        name: 'Unlimited',
        price_cents: 15000,
        interval: 'month',
        gym_id: VALID_GYM_ID,
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(403);
    expect(createProduct).not.toHaveBeenCalled();
  });
});

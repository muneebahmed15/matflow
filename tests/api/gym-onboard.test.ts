import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockFrom, mockGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

import { POST } from '@/app/api/gym/onboard/route';
import { jsonRequest, chain, readJson } from './helpers';

const USER = { id: 'user-1', email: 'owner@example.com', user_metadata: { first_name: 'Ada' } };

describe('POST /api/gym/onboard', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockGetUser.mockReset();
  });

  it('provisions a gym and admin staff role for the golden path', async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockFrom
      .mockReturnValueOnce(chain({ data: null })) // userHasGym: staff_roles lookup
      .mockReturnValueOnce(chain({ data: null })) // userHasGym: gyms owner lookup
      .mockReturnValueOnce(chain({ data: null })) // slug availability check
      .mockReturnValueOnce(chain({ data: { id: 'gym-1', name: "Ada's Gym", slug: 'ada-s-gym' }, error: null })) // insert gym
      .mockReturnValueOnce(chain({ error: null })); // insert staff_roles

    const res = await POST(jsonRequest('http://test/api/gym/onboard', {}) as unknown as NextRequest);

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body).toMatchObject({ gym: { id: 'gym-1' } });
  });

  it('rejects a non-string name with 400', async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockFrom
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ data: null }));

    const res = await POST(
      jsonRequest('http://test/api/gym/onboard', { name: 12345 }) as unknown as NextRequest
    );

    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated requests with 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } });

    const res = await POST(jsonRequest('http://test/api/gym/onboard', {}) as unknown as NextRequest);

    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

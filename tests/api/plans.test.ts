import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { requireStaffAuth, listActivePlans } = vi.hoisted(() => ({
  requireStaffAuth: vi.fn(),
  listActivePlans: vi.fn(),
}));

vi.mock('@/lib/auth/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/api')>('@/lib/auth/api');
  return { ...actual, requireStaffAuth };
});

vi.mock('@/services/plans', () => ({ listActivePlans }));

import { GET } from '@/app/api/plans/route';
import { getRequest, makeStaffAuth, readJson, VALID_GYM_ID } from './helpers';

describe('GET /api/plans', () => {
  beforeEach(() => {
    requireStaffAuth.mockReset();
    listActivePlans.mockReset();
  });

  it('lists active plans for the golden path', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth({ gymId: VALID_GYM_ID }));
    listActivePlans.mockResolvedValue([{ id: 'plan-1' }]);

    const res = await GET(getRequest(`http://test/api/plans?gym_id=${VALID_GYM_ID}`) as unknown as NextRequest);

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body).toEqual({ data: [{ id: 'plan-1' }] });
  });

  it('rejects a missing gym_id with 400', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth());

    const res = await GET(getRequest('http://test/api/plans') as unknown as NextRequest);

    expect(res.status).toBe(400);
  });

  it('forbids listing another gym\'s plans', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth({ gymId: 'some-other-gym' }));

    const res = await GET(getRequest(`http://test/api/plans?gym_id=${VALID_GYM_ID}`) as unknown as NextRequest);

    expect(res.status).toBe(403);
    expect(listActivePlans).not.toHaveBeenCalled();
  });
});

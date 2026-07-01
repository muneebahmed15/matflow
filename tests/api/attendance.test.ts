import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { requireStaffAuth, checkInMember, listAttendance, validateKioskCheckIn } = vi.hoisted(() => ({
  requireStaffAuth: vi.fn(),
  checkInMember: vi.fn(),
  listAttendance: vi.fn(),
  validateKioskCheckIn: vi.fn(),
}));

vi.mock('@/lib/auth/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/api')>('@/lib/auth/api');
  return { ...actual, requireStaffAuth };
});

vi.mock('@/services/attendance', () => ({
  checkInMember,
  listAttendance,
  validateKioskCheckIn,
}));

import { GET, POST } from '@/app/api/attendance/route';
import { jsonRequest, getRequest, makeStaffAuth, readJson, VALID_GYM_ID, VALID_MEMBER_ID } from './helpers';

describe('POST /api/attendance', () => {
  beforeEach(() => {
    requireStaffAuth.mockReset();
    checkInMember.mockReset();
    validateKioskCheckIn.mockReset();
  });

  it('checks in a member for the golden path (staff)', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth({ gymId: VALID_GYM_ID }));
    checkInMember.mockResolvedValue({ id: 'att-1' });

    const res = await POST(
      jsonRequest('http://test/api/attendance', {
        member_id: VALID_MEMBER_ID,
        gym_id: VALID_GYM_ID,
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body).toEqual({ data: { id: 'att-1' } });
  });

  it('rejects a malformed body with 400', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth());

    const res = await POST(
      jsonRequest('http://test/api/attendance', { member_id: 'not-a-uuid', gym_id: VALID_GYM_ID }) as unknown as NextRequest
    );

    expect(res.status).toBe(400);
    expect(checkInMember).not.toHaveBeenCalled();
  });

  it('forbids staff checking in a member outside their gym', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth({ gymId: 'some-other-gym' }));

    const res = await POST(
      jsonRequest('http://test/api/attendance', {
        member_id: VALID_MEMBER_ID,
        gym_id: VALID_GYM_ID,
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(403);
    expect(checkInMember).not.toHaveBeenCalled();
  });
});

describe('GET /api/attendance', () => {
  beforeEach(() => {
    requireStaffAuth.mockReset();
    listAttendance.mockReset();
  });

  it('lists attendance for the golden path', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth({ gymId: VALID_GYM_ID }));
    listAttendance.mockResolvedValue([{ id: 'att-1' }]);

    const res = await GET(getRequest(`http://test/api/attendance?gym_id=${VALID_GYM_ID}`) as unknown as NextRequest);

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body).toEqual({ data: [{ id: 'att-1' }] });
  });

  it('rejects a missing gym_id with 400', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth());

    const res = await GET(getRequest('http://test/api/attendance') as unknown as NextRequest);

    expect(res.status).toBe(400);
  });

  it('forbids listing another gym\'s attendance', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth({ gymId: 'some-other-gym' }));

    const res = await GET(getRequest(`http://test/api/attendance?gym_id=${VALID_GYM_ID}`) as unknown as NextRequest);

    expect(res.status).toBe(403);
    expect(listAttendance).not.toHaveBeenCalled();
  });
});

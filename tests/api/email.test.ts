import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const { requireStaffAuth, sendMemberNotification } = vi.hoisted(() => ({
  requireStaffAuth: vi.fn(),
  sendMemberNotification: vi.fn(),
}));

vi.mock('@/lib/auth/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/api')>('@/lib/auth/api');
  return { ...actual, requireStaffAuth };
});

vi.mock('@/services/notifications', () => ({ sendMemberNotification }));

import { POST } from '@/app/api/email/route';
import { jsonRequest, makeStaffAuth, readJson, VALID_GYM_ID, VALID_MEMBER_ID } from './helpers';

describe('POST /api/email', () => {
  beforeEach(() => {
    requireStaffAuth.mockReset();
    sendMemberNotification.mockReset();
  });

  it('sends a notification for the golden path', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth({ gymId: VALID_GYM_ID }));
    sendMemberNotification.mockResolvedValue({ sent: true });

    const res = await POST(
      jsonRequest('http://test/api/email', {
        type: 'welcome',
        member_id: VALID_MEMBER_ID,
        gym_id: VALID_GYM_ID,
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body).toMatchObject({ success: true, sent: true });
  });

  it('rejects an invalid notification type with 400', async () => {
    requireStaffAuth.mockResolvedValue(makeStaffAuth({ gymId: VALID_GYM_ID }));

    const res = await POST(
      jsonRequest('http://test/api/email', {
        type: 'not-a-real-type',
        member_id: VALID_MEMBER_ID,
        gym_id: VALID_GYM_ID,
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(400);
    expect(sendMemberNotification).not.toHaveBeenCalled();
  });

  it('propagates a 401 when unauthenticated', async () => {
    requireStaffAuth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    const res = await POST(
      jsonRequest('http://test/api/email', {
        type: 'welcome',
        member_id: VALID_MEMBER_ID,
        gym_id: VALID_GYM_ID,
      }) as unknown as NextRequest
    );

    expect(res.status).toBe(401);
    expect(sendMemberNotification).not.toHaveBeenCalled();
  });
});

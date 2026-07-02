import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getUser, serverFrom, adminFrom } = vi.hoisted(() => ({
  getUser: vi.fn(),
  serverFrom: vi.fn(),
  adminFrom: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser }, from: serverFrom }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: adminFrom }),
}));

const assertPortalMemberAccess = vi.hoisted(() => vi.fn());

vi.mock('@/services/portal-family', () => ({
  assertPortalMemberAccess,
}));

import {
  assertGymScope,
  assertSubscriptionInGym,
  isErrorResponse,
  requireMemberAuth,
  requireStaffAuth,
  requireStaffOrMemberAuth,
} from '@/lib/auth/api';

function chain(result: { data?: unknown; error?: unknown } = { data: null }) {
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'eq'];
  for (const method of methods) {
    builder[method] = () => builder;
  }
  builder.maybeSingle = async () => result;
  builder.single = async () => result;
  return builder;
}

const USER = { id: 'user-1', email: 'staff@example.com' };

describe('requireStaffAuth', () => {
  beforeEach(() => {
    getUser.mockReset();
    serverFrom.mockReset();
  });

  it('returns 401 when there is no session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await requireStaffAuth();

    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) expect(result.status).toBe(401);
  });

  it('resolves a staff_roles match as the primary path', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    serverFrom.mockReturnValueOnce(chain({ data: { role: 'coach', gym_id: 'gym-1' } }));

    const result = await requireStaffAuth();

    expect(result).toMatchObject({ gymId: 'gym-1', role: 'coach' });
  });

  it('falls back to gym ownership when there is no staff_roles row', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    serverFrom
      .mockReturnValueOnce(chain({ data: null })) // staff_roles miss
      .mockReturnValueOnce(chain({ data: { id: 'gym-1' } })); // owns gym

    const result = await requireStaffAuth();

    expect(result).toMatchObject({ gymId: 'gym-1', role: 'admin' });
  });

  it('returns 403 when the user has no staff role and owns no gym', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    serverFrom
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ data: null }));

    const result = await requireStaffAuth();

    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) expect(result.status).toBe(403);
  });

  it('returns 403 for a coach when adminOnly is required', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    serverFrom.mockReturnValueOnce(chain({ data: { role: 'coach', gym_id: 'gym-1' } }));

    const result = await requireStaffAuth({ adminOnly: true });

    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) expect(result.status).toBe(403);
  });

  it('allows a supervisor when leads.read capability is required', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    serverFrom.mockReturnValueOnce(chain({ data: { role: 'supervisor', gym_id: 'gym-1' } }));

    const result = await requireStaffAuth({ capability: 'leads.read' });

    expect(result).toMatchObject({ role: 'supervisor' });
  });
});

describe('requireMemberAuth', () => {
  beforeEach(() => {
    getUser.mockReset();
    serverFrom.mockReset();
    adminFrom.mockReset();
    assertPortalMemberAccess.mockReset();
  });

  it('returns 401 when there is no session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await requireMemberAuth();

    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) expect(result.status).toBe(401);
  });

  it('returns 403 when no member row matches the user email', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    serverFrom.mockReturnValueOnce(chain({ data: null }));

    const result = await requireMemberAuth();

    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) expect(result.status).toBe(403);
  });

  it('returns the member auth when a matching row exists', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    serverFrom.mockReturnValueOnce(
      chain({ data: { id: 'member-1', gym_id: 'gym-1', email: USER.email, portal_role: 'primary' } })
    );

    const result = await requireMemberAuth();

    expect(result).toMatchObject({ memberId: 'member-1', gymId: 'gym-1', portalRole: 'primary' });
  });

  it('returns 403 when family access is denied for another member', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    assertPortalMemberAccess.mockRejectedValue(new Error('Forbidden'));

    const result = await requireMemberAuth({ memberId: 'member-2' });

    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) expect(result.status).toBe(403);
  });

  it('allows acting as a family member when access is granted', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    assertPortalMemberAccess.mockResolvedValue({
      memberId: 'member-2',
      gymId: 'gym-1',
      email: USER.email,
    });
    adminFrom
      .mockReturnValueOnce(chain({ data: { portal_role: 'dependent' } }))
      .mockReturnValueOnce(chain({ data: { id: 'member-1' } }));

    const result = await requireMemberAuth({ memberId: 'member-2' });

    expect(result).toMatchObject({
      memberId: 'member-2',
      portalRole: 'dependent',
      authMemberId: 'member-1',
    });
  });
});

describe('requireStaffOrMemberAuth', () => {
  beforeEach(() => {
    getUser.mockReset();
    serverFrom.mockReset();
    adminFrom.mockReset();
  });

  it('resolves the staff path when the user is gym staff', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    serverFrom.mockReturnValueOnce(chain({ data: { role: 'admin', gym_id: 'gym-1' } }));
    adminFrom.mockReturnValueOnce(chain({ data: { id: 'member-1' } }));

    const result = await requireStaffOrMemberAuth({ gymId: 'gym-1', memberId: 'member-1' });

    expect(result).toMatchObject({ kind: 'staff' });
  });

  it('falls back to the member path when the user is not staff', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    serverFrom
      .mockReturnValueOnce(chain({ data: null })) // not staff
      .mockReturnValueOnce(chain({ data: null })); // does not own a gym
    assertPortalMemberAccess.mockResolvedValue({
      memberId: 'member-1',
      gymId: 'gym-1',
      email: USER.email!,
    });
    adminFrom
      .mockReturnValueOnce(chain({ data: { portal_role: 'primary' } }))
      .mockReturnValueOnce(chain({ data: { id: 'member-1' } }));

    const result = await requireStaffOrMemberAuth({ gymId: 'gym-1', memberId: 'member-1' });

    expect(result).toMatchObject({ kind: 'member' });
  });
});

describe('assertGymScope', () => {
  it('returns null when the gym matches', () => {
    expect(assertGymScope({ gymId: 'gym-1' } as never, 'gym-1')).toBeNull();
  });

  it('returns a 403 response when the gym does not match', () => {
    const result = assertGymScope({ gymId: 'gym-1' } as never, 'gym-2');
    expect(result?.status).toBe(403);
  });
});

describe('assertSubscriptionInGym', () => {
  beforeEach(() => {
    adminFrom.mockReset();
  });

  it('returns 404 when the subscription does not exist', async () => {
    adminFrom.mockReturnValueOnce(chain({ data: null }));

    const result = await assertSubscriptionInGym({ gymId: 'gym-1' } as never, 'sub-1');

    expect(result?.status).toBe(404);
  });

  it('returns 403 when the subscription belongs to a different gym', async () => {
    adminFrom.mockReturnValueOnce(chain({ data: { id: 'sub-1', gym_id: 'gym-2' } }));

    const result = await assertSubscriptionInGym({ gymId: 'gym-1' } as never, 'sub-1');

    expect(result?.status).toBe(403);
  });

  it('returns null when the subscription belongs to the same gym', async () => {
    adminFrom.mockReturnValueOnce(chain({ data: { id: 'sub-1', gym_id: 'gym-1' } }));

    const result = await assertSubscriptionInGym({ gymId: 'gym-1' } as never, 'sub-1');

    expect(result).toBeNull();
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getUser, serverFrom, warn, redirect } = vi.hoisted(() => ({
  getUser: vi.fn(),
  serverFrom: vi.fn(),
  warn: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT:${path}`), { digest: `NEXT_REDIRECT;${path}` });
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser }, from: serverFrom }),
}));

vi.mock('next/navigation', () => ({ redirect }));

vi.mock('@/lib/logger', () => ({
  logger: { warn, error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

import {
  assertGymAccess,
  requireStaffSession,
  requireStaffSessionForPage,
  resolveStaffAuth,
} from '@/lib/auth/staff';

function chain(result: { data?: unknown; error?: unknown } = { data: null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq']) {
    builder[method] = () => builder;
  }
  builder.maybeSingle = async () => result;
  return builder;
}

const USER = { id: 'user-1', email: 'staff@example.com' } as never;

describe('resolveStaffAuth', () => {
  beforeEach(() => serverFrom.mockReset());

  it('resolves via staff_roles when present', async () => {
    serverFrom.mockReturnValueOnce(chain({ data: { role: 'coach', gym_id: 'gym-1' } }));

    const result = await resolveStaffAuth(USER);

    expect(result).toEqual({ user: USER, gymId: 'gym-1', role: 'coach' });
  });

  it('falls back to gym ownership as admin', async () => {
    serverFrom
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ data: { id: 'gym-1' } }));

    const result = await resolveStaffAuth(USER);

    expect(result).toEqual({ user: USER, gymId: 'gym-1', role: 'admin' });
  });

  it('returns null when neither staff role nor gym ownership resolves', async () => {
    serverFrom
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ data: null }));

    const result = await resolveStaffAuth(USER);

    expect(result).toBeNull();
  });
});

describe('requireStaffSession', () => {
  beforeEach(() => {
    getUser.mockReset();
    serverFrom.mockReset();
  });

  it('throws Unauthorized when there is no session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requireStaffSession()).rejects.toThrow('Unauthorized');
  });

  it('throws Forbidden when the user resolves to no staff auth', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    serverFrom
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ data: null }));

    await expect(requireStaffSession()).rejects.toThrow('Forbidden');
  });

  it('throws Forbidden when adminOnly is required but the user is a coach', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    serverFrom.mockReturnValueOnce(chain({ data: { role: 'coach', gym_id: 'gym-1' } }));

    await expect(requireStaffSession({ adminOnly: true })).rejects.toThrow('Forbidden');
  });

  it('resolves for a valid admin session', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    serverFrom.mockReturnValueOnce(chain({ data: { role: 'admin', gym_id: 'gym-1' } }));

    await expect(requireStaffSession({ adminOnly: true })).resolves.toMatchObject({
      role: 'admin',
      gymId: 'gym-1',
    });
  });
});

describe('requireStaffSessionForPage', () => {
  beforeEach(() => {
    getUser.mockReset();
    serverFrom.mockReset();
    warn.mockReset();
    redirect.mockClear();
  });

  it('returns the session when valid', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    serverFrom.mockReturnValueOnce(chain({ data: { role: 'admin', gym_id: 'gym-1' } }));

    await expect(requireStaffSessionForPage()).resolves.toMatchObject({ gymId: 'gym-1' });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('logs the reason and redirects to /dashboard on failure, instead of silently swallowing it', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requireStaffSessionForPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard');

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'Unauthorized' }),
      expect.any(String)
    );
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });
});

describe('assertGymAccess', () => {
  it('does not throw when the gym matches', () => {
    expect(() => assertGymAccess({ gymId: 'gym-1' } as never, 'gym-1')).not.toThrow();
  });

  it('throws Forbidden when the gym does not match', () => {
    expect(() => assertGymAccess({ gymId: 'gym-1' } as never, 'gym-2')).toThrow('Forbidden');
  });
});

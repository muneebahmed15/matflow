import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServiceError } from '@/services/errors';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: mockFrom,
  }),
}));

import { removeSessionAttendance } from '@/services/class-sessions';

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'delete']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve);
  return builder;
}

describe('removeSessionAttendance', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('blocks coaches from removing past session attendance', async () => {
    mockFrom.mockReturnValueOnce(
      chain({
        data: { session_date: '2020-01-01' },
        error: null,
      })
    );

    await expect(
      removeSessionAttendance('gym-1', 'session-1', 'member-1', { staffRole: 'coach' })
    ).rejects.toMatchObject({
      status: 403,
      message: 'Past session attendance can only be removed by an admin or supervisor.',
    });
  });

  it('allows admins to remove past session attendance', async () => {
    mockFrom
      .mockReturnValueOnce(
        chain({
          data: { session_date: '2020-01-01' },
          error: null,
        })
      )
      .mockReturnValueOnce(chain({ data: null, error: null }));

    await expect(
      removeSessionAttendance('gym-1', 'session-1', 'member-1', { staffRole: 'admin' })
    ).resolves.toBeUndefined();
  });

  it('allows coaches to remove today session attendance', async () => {
    const today = new Date().toISOString().slice(0, 10);
    mockFrom
      .mockReturnValueOnce(
        chain({
          data: { session_date: today },
          error: null,
        })
      )
      .mockReturnValueOnce(chain({ data: null, error: null }));

    await expect(
      removeSessionAttendance('gym-1', 'session-1', 'member-1', { staffRole: 'coach' })
    ).resolves.toBeUndefined();
  });

  it('throws 404 when session is missing', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: null, error: null }));

    await expect(
      removeSessionAttendance('gym-1', 'session-1', 'member-1', { staffRole: 'admin' })
    ).rejects.toBeInstanceOf(ServiceError);
  });
});

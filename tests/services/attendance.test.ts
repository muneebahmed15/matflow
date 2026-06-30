import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServiceError } from '@/services/errors';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: mockFrom,
  }),
}));

import { checkInMember, getTodayCheckedInMemberIds } from '@/services/attendance';

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'insert'];
  for (const method of methods) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  builder.then = (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve);
  return builder;
}

describe('attendance service', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('throws 404 when member is not in gym', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: null }));

    await expect(
      checkInMember({ gymId: 'gym-1', memberId: 'member-1' })
    ).rejects.toMatchObject({ status: 404, message: 'Member not found' });
  });

  it('throws 409 when member already checked in today', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'member-1' } }))
      .mockReturnValueOnce(chain({ data: { id: 'att-1' } }));

    await expect(
      checkInMember({ gymId: 'gym-1', memberId: 'member-1' })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('returns member ids checked in today', async () => {
    mockFrom.mockReturnValueOnce(
      chain({
        data: [{ member_id: 'm1' }, { member_id: 'm2' }],
        error: null,
      })
    );

    const ids = await getTodayCheckedInMemberIds('gym-1');
    expect(ids).toEqual(['m1', 'm2']);
  });

  it('wraps database errors as ServiceError', async () => {
    mockFrom.mockReturnValueOnce(
      chain({ data: null, error: { message: 'db down' } })
    );

    await expect(getTodayCheckedInMemberIds('gym-1')).rejects.toBeInstanceOf(ServiceError);
  });
});

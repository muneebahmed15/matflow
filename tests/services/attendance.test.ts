import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServiceError } from '@/services/errors';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: mockFrom,
  }),
}));

import {
  checkInMember,
  getTodayCheckedInMemberIds,
  listAttendance,
  validateKioskCheckIn,
} from '@/services/attendance';

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

  describe('listAttendance', () => {
    it('returns records for a gym without a date filter', async () => {
      mockFrom.mockReturnValueOnce(chain({ data: [{ id: 'att-1' }], error: null }));

      const result = await listAttendance('gym-1');

      expect(result).toEqual([{ id: 'att-1' }]);
    });

    it('throws a ServiceError on a database error', async () => {
      mockFrom.mockReturnValueOnce(chain({ data: null, error: { message: 'db down' } }));

      await expect(listAttendance('gym-1')).rejects.toBeInstanceOf(ServiceError);
    });
  });

  describe('validateKioskCheckIn', () => {
    it('throws 403 when kiosk check-in is disabled for the gym', async () => {
      mockFrom.mockReturnValueOnce(chain({ data: { id: 'gym-1', kiosk_enabled: false } }));

      await expect(validateKioskCheckIn('gym-1', 'member-1')).rejects.toMatchObject({
        status: 403,
      });
    });

    it('throws 404 when the member does not exist in this gym', async () => {
      mockFrom
        .mockReturnValueOnce(chain({ data: { id: 'gym-1', kiosk_enabled: true } }))
        .mockReturnValueOnce(chain({ data: null }));

      await expect(validateKioskCheckIn('gym-1', 'member-1')).rejects.toMatchObject({
        status: 404,
      });
    });

    it('throws a clear 403 for a past_due member instead of a generic not-found', async () => {
      mockFrom
        .mockReturnValueOnce(chain({ data: { id: 'gym-1', kiosk_enabled: true } }))
        .mockReturnValueOnce(chain({ data: { id: 'member-1', status: 'past_due' } }));

      await expect(validateKioskCheckIn('gym-1', 'member-1')).rejects.toMatchObject({
        status: 403,
        message: expect.stringMatching(/past due/i),
      });
    });

    it('throws 403 for an inactive member', async () => {
      mockFrom
        .mockReturnValueOnce(chain({ data: { id: 'gym-1', kiosk_enabled: true } }))
        .mockReturnValueOnce(chain({ data: { id: 'member-1', status: 'inactive' } }));

      await expect(validateKioskCheckIn('gym-1', 'member-1')).rejects.toMatchObject({
        status: 403,
      });
    });

    it('allows an active member through without throwing', async () => {
      mockFrom
        .mockReturnValueOnce(chain({ data: { id: 'gym-1', kiosk_enabled: true } }))
        .mockReturnValueOnce(chain({ data: { id: 'member-1', status: 'active' } }));

      await expect(validateKioskCheckIn('gym-1', 'member-1')).resolves.toBeUndefined();
    });
  });
});

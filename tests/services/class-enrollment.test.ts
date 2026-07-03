import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

vi.mock('@/services/class-waitlist', () => ({
  promoteNextFromWaitlist: vi.fn(async () => null),
}));

import {
  assertClassHasCapacity,
  enrollMemberInClass,
  cancelEnrollment,
} from '@/services/class-enrollment';
import { promoteNextFromWaitlist } from '@/services/class-waitlist';

function chain(result: {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'insert', 'update', 'upsert', 'order']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  builder.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(resolve({ error: result.error ?? null, count: result.count ?? null }));
  return builder;
}

describe('assertClassHasCapacity', () => {
  it('throws 409 when the class is at capacity', () => {
    expect(() => assertClassHasCapacity(10, 10)).toThrowError(/full/i);
    expect(() => assertClassHasCapacity(10, 12)).toThrowError(/full/i);
  });

  it('allows enrollment below capacity', () => {
    expect(() => assertClassHasCapacity(10, 9)).not.toThrow();
  });

  it('treats null or zero capacity as unlimited', () => {
    expect(() => assertClassHasCapacity(null, 500)).not.toThrow();
    expect(() => assertClassHasCapacity(0, 500)).not.toThrow();
  });
});

describe('enrollMemberInClass', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('rejects when the class is full', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'c1', capacity: 2 } })) // class
      .mockReturnValueOnce(chain({ data: { id: 'm1', status: 'active' } })) // member
      .mockReturnValueOnce(chain({ data: null })) // existing enrollment
      .mockReturnValueOnce(chain({ count: 2 })); // active count

    await expect(
      enrollMemberInClass({ gymId: 'g1', classId: 'c1', memberId: 'm1' })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rejects duplicate active bookings', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'c1', capacity: 20 } }))
      .mockReturnValueOnce(chain({ data: { id: 'm1', status: 'active' } }))
      .mockReturnValueOnce(chain({ data: { id: 'e1', status: 'active' } }));

    await expect(
      enrollMemberInClass({ gymId: 'g1', classId: 'c1', memberId: 'm1' })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rejects inactive members', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'c1', capacity: 20 } }))
      .mockReturnValueOnce(chain({ data: { id: 'm1', status: 'inactive' } }));

    await expect(
      enrollMemberInClass({ gymId: 'g1', classId: 'c1', memberId: 'm1' })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('enrolls when a spot is available', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'c1', capacity: 20 } }))
      .mockReturnValueOnce(chain({ data: { id: 'm1', status: 'active' } }))
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ count: 5 }))
      .mockReturnValueOnce(
        chain({ data: { id: 'e1', class_id: 'c1', member_id: 'm1', status: 'active' } })
      );

    const result = await enrollMemberInClass({ gymId: 'g1', classId: 'c1', memberId: 'm1' });
    expect(result.id).toBe('e1');
  });
});

describe('cancelEnrollment', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    vi.mocked(promoteNextFromWaitlist).mockClear();
  });

  it('cancels and promotes the next waitlisted member', async () => {
    mockFrom.mockReturnValueOnce(chain({ error: null }));

    await cancelEnrollment({ gymId: 'g1', classId: 'c1', memberId: 'm1' });
    expect(promoteNextFromWaitlist).toHaveBeenCalledWith('g1', 'c1');
  });
});

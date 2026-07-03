import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

vi.mock('@/services/class-enrollment', () => ({
  countActiveEnrollments: vi.fn(async () => 0),
  assertClassHasCapacity: vi.fn((capacity: number | null, count: number) => {
    if (capacity !== null && capacity > 0 && count >= capacity) {
      const err = new Error('full') as Error & { status: number };
      err.status = 409;
      throw err;
    }
  }),
}));

import { bookDropIn, cancelDropIn } from '@/services/class-dropin';
import { countActiveEnrollments } from '@/services/class-enrollment';

function chain(result: {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'gte', 'in', 'insert', 'update', 'upsert', 'order']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  builder.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(
      resolve({ error: result.error ?? null, data: result.data ?? null, count: result.count ?? null })
    );
  return builder;
}

const futureDate = () => new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);

describe('bookDropIn', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    vi.mocked(countActiveEnrollments).mockResolvedValue(0);
  });

  it('rejects past session dates', async () => {
    await expect(
      bookDropIn({ gymId: 'g1', classId: 'c1', memberId: 'm1', sessionDate: '2020-01-01' })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects malformed dates', async () => {
    await expect(
      bookDropIn({ gymId: 'g1', classId: 'c1', memberId: 'm1', sessionDate: 'tomorrow' })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects when session seats are exhausted', async () => {
    vi.mocked(countActiveEnrollments).mockResolvedValue(10);
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'c1', capacity: 10 } })) // class
      .mockReturnValueOnce(chain({ data: { id: 'm1', status: 'active' } })) // member
      .mockReturnValueOnce(chain({ data: { id: 's1' } })) // existing session
      .mockReturnValueOnce(chain({ data: null })) // existing booking
      .mockReturnValueOnce(chain({ count: 0 })); // drop-in count

    await expect(
      bookDropIn({ gymId: 'g1', classId: 'c1', memberId: 'm1', sessionDate: futureDate() })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('books a seat when capacity allows', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'c1', capacity: 10 } }))
      .mockReturnValueOnce(chain({ data: { id: 'm1', status: 'active' } }))
      .mockReturnValueOnce(chain({ data: { id: 's1' } }))
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ count: 3 }))
      .mockReturnValueOnce(chain({ data: { id: 'b1', session_id: 's1', status: 'booked' } }));

    const booking = await bookDropIn({
      gymId: 'g1',
      classId: 'c1',
      memberId: 'm1',
      sessionDate: futureDate(),
    });
    expect(booking.id).toBe('b1');
  });
});

describe('cancelDropIn', () => {
  beforeEach(() => mockFrom.mockReset());

  it('blocks cancellation inside the cancellation window', async () => {
    const soon = new Date(Date.now() + 30 * 60_000); // 30 minutes from now
    // Build both parts in local time so they stay consistent with the service's
    // `new Date(`${date}T${time}`)` parsing (which is local-time based).
    const pad = (n: number) => String(n).padStart(2, '0');
    const sessionDate = `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}`;
    const startTime = `${pad(soon.getHours())}:${pad(soon.getMinutes())}`;

    mockFrom
      .mockReturnValueOnce(
        chain({ data: { id: 's1', session_date: sessionDate, classes: { start_time: startTime } } })
      )
      .mockReturnValueOnce(chain({ data: { booking_cancel_hours: 2 } }));

    await expect(
      cancelDropIn({ gymId: 'g1', sessionId: 's1', memberId: 'm1' })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('allows cancellation outside the window', async () => {
    const later = new Date(Date.now() + 3 * 86_400_000);
    const sessionDate = later.toISOString().slice(0, 10);

    mockFrom
      .mockReturnValueOnce(
        chain({ data: { id: 's1', session_date: sessionDate, classes: { start_time: '18:00' } } })
      )
      .mockReturnValueOnce(chain({ data: { booking_cancel_hours: 2 } }))
      .mockReturnValueOnce(chain({ error: null }));

    await expect(
      cancelDropIn({ gymId: 'g1', sessionId: 's1', memberId: 'm1' })
    ).resolves.toBeUndefined();
  });
});

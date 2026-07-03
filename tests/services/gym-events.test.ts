import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServiceError } from '@/services/errors';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (v: unknown) => void) => resolve(result),
  };
  return builder;
}

describe('gym-events service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists events for a gym', async () => {
    const { listGymEvents } = await import('@/services/gym-events');
    const rows = [{ id: 'e1', gym_id: 'g1', title: 'Open Mat', event_type: 'open_mat', event_date: '2026-07-10' }];
    mockFrom.mockReturnValue(chain({ data: rows, error: null }));

    const result = await listGymEvents('g1');
    expect(result).toEqual(rows);
    expect(mockFrom).toHaveBeenCalledWith('gym_events');
  });

  it('throws ServiceError on insert failure', async () => {
    const { createGymEvent } = await import('@/services/gym-events');
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'insert failed' } }));

    await expect(
      createGymEvent({
        gymId: 'g1',
        title: 'Seminar',
        eventType: 'seminar',
        eventDate: '2026-08-01',
      })
    ).rejects.toBeInstanceOf(ServiceError);
  });
});

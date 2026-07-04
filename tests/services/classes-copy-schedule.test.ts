import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServiceError } from '@/services/errors';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

import { copyScheduleFromGym } from '@/services/classes';

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'neq', 'order', 'insert']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(async () => result);
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve);
  return builder;
}

describe('copyScheduleFromGym', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('rejects copying from a gym with a different owner', async () => {
    mockFrom.mockReturnValueOnce(
      chain({
        data: [
          { id: 'target', owner_id: 'owner-a' },
          { id: 'source', owner_id: 'owner-b' },
        ],
        error: null,
      })
    );

    await expect(copyScheduleFromGym('target', 'source')).rejects.toMatchObject({ status: 403 });
  });

  it('copies active classes from a sibling gym', async () => {
    mockFrom
      .mockReturnValueOnce(
        chain({
          data: [
            { id: 'target', owner_id: 'owner-a' },
            { id: 'source', owner_id: 'owner-a' },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(
        chain({
          data: [
            {
              name: 'No-Gi',
              description: 'All levels',
              instructor: 'Coach Ana',
              instructor_staff_id: 'staff-1',
              day_of_week: 'Tuesday',
              start_time: '18:00',
              end_time: '19:00',
              capacity: 24,
              category_tag: 'No-Gi',
              color: '#3B82F6',
              overbook_allowance: 2,
            },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(chain({ data: [{ id: 'staff-1' }], error: null }))
      .mockReturnValueOnce(chain({ data: [], error: null }))
      .mockReturnValueOnce(
        chain({
          data: { id: 'new-class', name: 'No-Gi' },
          error: null,
        })
      );

    const result = await copyScheduleFromGym('target', 'source');

    expect(result.copied).toBe(1);
  });

  it('throws when the source gym has no classes', async () => {
    mockFrom
      .mockReturnValueOnce(
        chain({
          data: [
            { id: 'target', owner_id: 'owner-a' },
            { id: 'source', owner_id: 'owner-a' },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(chain({ data: [], error: null }));

    await expect(copyScheduleFromGym('target', 'source')).rejects.toBeInstanceOf(ServiceError);
  });
});

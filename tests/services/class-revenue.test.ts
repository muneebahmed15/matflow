import { describe, expect, it, vi, beforeEach } from 'vitest';
import { attributeEnrollmentMrr } from '@/services/class-revenue';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

import { getInstructorScopedClassIds } from '@/services/instructor-scope';
import type { StaffAuth } from '@/lib/auth/staff';

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve);
  return builder;
}

describe('attributeEnrollmentMrr', () => {
  it('splits member MRR evenly across enrolled classes', () => {
    const attributed = attributeEnrollmentMrr(
      [
        { class_id: 'c1', member_id: 'm1' },
        { class_id: 'c2', member_id: 'm1' },
        { class_id: 'c1', member_id: 'm2' },
      ],
      new Map([
        ['m1', 10000],
        ['m2', 5000],
      ])
    );

    expect(attributed.get('c1')).toBe(10000);
    expect(attributed.get('c2')).toBe(5000);
  });
});

describe('getInstructorScopedClassIds', () => {
  const auth: StaffAuth = {
    user: { id: 'user-1' } as StaffAuth['user'],
    gymId: 'gym-1',
    role: 'coach',
  };

  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('includes instructor classes and permission overrides', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'staff-1' }, error: null }))
      .mockReturnValueOnce(chain({ data: [{ id: 'class-a' }], error: null }))
      .mockReturnValueOnce(chain({ data: [{ class_id: 'class-b' }], error: null }));

    const classIds = await getInstructorScopedClassIds(auth);
    expect(classIds).toEqual(['class-a', 'class-b']);
  });
});

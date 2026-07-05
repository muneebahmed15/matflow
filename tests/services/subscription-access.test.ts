import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

import { memberHasSubscriptionAccess } from '@/services/subscription-access';

function chain(result: { data?: unknown; error?: null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'order', 'limit']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  return builder;
}

describe('memberHasSubscriptionAccess', () => {
  beforeEach(() => mockFrom.mockReset());

  it('returns true when member has direct subscription', async () => {
    mockFrom.mockReturnValueOnce(
      chain({ data: { id: 's1', family_id: null, status: 'active' } })
    );
    await expect(memberHasSubscriptionAccess('g1', 'm1')).resolves.toBe(true);
  });

  it('checks family subscription when no direct sub', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ data: { family_id: 'f1' } }))
      .mockReturnValueOnce(
        chain({ data: { id: 's2', family_id: 'f1', status: 'active' } })
      );
    await expect(memberHasSubscriptionAccess('g1', 'm1')).resolves.toBe(true);
  });
});

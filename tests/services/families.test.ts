import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

import { mergeFamilies } from '@/services/families';

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'update', 'insert', 'delete', 'order']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(async () => result);
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve);
  return builder;
}

describe('families service', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('rejects merging a family into itself', async () => {
    await expect(mergeFamilies('g1', 'f1', 'f1')).rejects.toThrow('Cannot merge a family into itself');
  });

  it('merges source family members into target and deletes source', async () => {
    mockFrom
      .mockReturnValueOnce(
        chain({
          data: {
            id: 'target',
            family_name: 'Smith',
            primary_email: 'smith@example.com',
            billing_member_id: null,
            stripe_customer_id: null,
          },
          error: null,
        })
      )
      .mockReturnValueOnce(
        chain({
          data: {
            id: 'source',
            stripe_customer_id: 'cus_123',
            primary_email: null,
          },
          error: null,
        })
      )
      .mockReturnValueOnce(chain({ error: null }))
      .mockReturnValueOnce(chain({ error: null }))
      .mockReturnValueOnce(chain({ error: null }))
      .mockReturnValueOnce(
        chain({
          data: {
            id: 'target',
            family_name: 'Smith',
            primary_email: 'smith@example.com',
            created_at: '2024-01-01',
            billing_member_id: null,
          },
          error: null,
        })
      );

    const merged = await mergeFamilies('g1', 'target', 'source');
    expect(merged.id).toBe('target');
    expect(merged.family_name).toBe('Smith');
    expect(mockFrom).toHaveBeenCalledTimes(6);
  });

  it('throws when family not found', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: null, error: null }))
      .mockReturnValueOnce(chain({ data: null, error: null }));

    await expect(mergeFamilies('g1', 'target', 'source')).rejects.toThrow('Family not found');
  });
});

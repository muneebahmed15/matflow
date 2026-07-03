import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

vi.mock('@/services/audit', () => ({
  logAuditEvent: vi.fn(async () => undefined),
}));

import { promoteMember, undoPromotion } from '@/services/belts';

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'insert', 'update', 'delete', 'order', 'limit']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  builder.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(resolve({ error: result.error ?? null, data: result.data ?? null }));
  return builder;
}

const gymWithSystem = (system: string) =>
  chain({ data: { belt_system: system, belt_custom_order: null } });

describe('promoteMember', () => {
  beforeEach(() => mockFrom.mockReset());

  it('rejects belts that are not in the gym belt system', async () => {
    mockFrom.mockReturnValueOnce(gymWithSystem('bjj_adult'));

    await expect(
      promoteMember({ gymId: 'g1', memberId: 'm1', fromBelt: 'white', toBelt: 'red' })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects demotions unless explicitly allowed', async () => {
    mockFrom.mockReturnValueOnce(gymWithSystem('bjj_adult'));

    await expect(
      promoteMember({ gymId: 'g1', memberId: 'm1', fromBelt: 'purple', toBelt: 'blue' })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('allows demotion when allowDemotion is set (admin)', async () => {
    mockFrom
      .mockReturnValueOnce(gymWithSystem('bjj_adult'))
      .mockReturnValueOnce(chain({ error: null })) // insert promotion
      .mockReturnValueOnce(chain({ error: null })); // update member

    await expect(
      promoteMember({
        gymId: 'g1',
        memberId: 'm1',
        fromBelt: 'purple',
        toBelt: 'blue',
        allowDemotion: true,
      })
    ).resolves.toBeUndefined();
  });

  it('promotes and resets stripes on success', async () => {
    const memberUpdate = chain({ error: null });
    mockFrom
      .mockReturnValueOnce(gymWithSystem('bjj_adult'))
      .mockReturnValueOnce(chain({ error: null }))
      .mockReturnValueOnce(memberUpdate);

    await promoteMember({ gymId: 'g1', memberId: 'm1', fromBelt: 'white', toBelt: 'blue' });

    expect(memberUpdate.update).toHaveBeenCalledWith({ belt_rank: 'blue', stripe_count: 0 });
  });

  it('validates against the configured system (karate)', async () => {
    mockFrom
      .mockReturnValueOnce(gymWithSystem('karate'))
      .mockReturnValueOnce(chain({ error: null }))
      .mockReturnValueOnce(chain({ error: null }));

    await expect(
      promoteMember({ gymId: 'g1', memberId: 'm1', fromBelt: 'white', toBelt: 'red' })
    ).resolves.toBeUndefined();
  });
});

describe('undoPromotion', () => {
  beforeEach(() => mockFrom.mockReset());

  it('rejects when the promotion is not the most recent for the member', async () => {
    mockFrom
      .mockReturnValueOnce(
        chain({ data: { id: 'p1', member_id: 'm1', from_belt: 'white', to_belt: 'blue' } })
      )
      .mockReturnValueOnce(chain({ data: { id: 'p2' } }));

    await expect(undoPromotion('g1', 'p1')).rejects.toMatchObject({ status: 409 });
  });

  it('deletes the promotion and reverts the member belt', async () => {
    const memberUpdate = chain({ error: null });
    mockFrom
      .mockReturnValueOnce(
        chain({ data: { id: 'p1', member_id: 'm1', from_belt: 'white', to_belt: 'blue' } })
      )
      .mockReturnValueOnce(chain({ data: { id: 'p1' } }))
      .mockReturnValueOnce(chain({ error: null })) // delete
      .mockReturnValueOnce(memberUpdate);

    await undoPromotion('g1', 'p1', 'actor-1');
    expect(memberUpdate.update).toHaveBeenCalledWith({ belt_rank: 'white' });
  });

  it('404s when the promotion does not exist', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: null }));
    await expect(undoPromotion('g1', 'missing')).rejects.toMatchObject({ status: 404 });
  });
});

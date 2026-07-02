import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServiceError } from '@/services/errors';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

import { assertMemberWaiverCompliance } from '@/services/waivers';

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve);
  return builder;
}

describe('assertMemberWaiverCompliance', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('passes when there are no active waivers', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { require_waiver_for_checkin: true }, error: null }))
      .mockReturnValueOnce(chain({ data: [], error: null }));
    await expect(assertMemberWaiverCompliance('gym-1', 'member-1')).resolves.toBeUndefined();
  });

  it('throws when an active waiver is unsigned', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { require_waiver_for_checkin: true }, error: null }))
      .mockReturnValueOnce(chain({ data: [{ id: 'w1', title: 'Liability Waiver' }], error: null }))
      .mockReturnValueOnce(chain({ data: [], error: null }));

    await expect(assertMemberWaiverCompliance('gym-1', 'member-1')).rejects.toMatchObject({
      status: 403,
    });
  });

  it('throws when the only signature is expired', async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    mockFrom
      .mockReturnValueOnce(chain({ data: { require_waiver_for_checkin: true }, error: null }))
      .mockReturnValueOnce(chain({ data: [{ id: 'w1', title: 'Liability Waiver' }], error: null }))
      .mockReturnValueOnce(
        chain({
          data: [{ waiver_id: 'w1', expires_at: past, signed_at: '2026-01-01' }],
          error: null,
        })
      );

    await expect(assertMemberWaiverCompliance('gym-1', 'member-1')).rejects.toBeInstanceOf(
      ServiceError
    );
  });

  it('passes when all active waivers have valid signatures', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    mockFrom
      .mockReturnValueOnce(chain({ data: { require_waiver_for_checkin: true }, error: null }))
      .mockReturnValueOnce(chain({ data: [{ id: 'w1', title: 'Liability Waiver' }], error: null }))
      .mockReturnValueOnce(
        chain({
          data: [{ waiver_id: 'w1', expires_at: future, signed_at: '2026-06-01' }],
          error: null,
        })
      );

    await expect(assertMemberWaiverCompliance('gym-1', 'member-1')).resolves.toBeUndefined();
  });

  it('skips check when gym disables require_waiver_for_checkin', async () => {
    mockFrom.mockReturnValueOnce(
      chain({ data: { require_waiver_for_checkin: false }, error: null })
    );

    await expect(assertMemberWaiverCompliance('gym-1', 'member-1')).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

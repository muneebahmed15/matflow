import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: mockFrom,
    storage: { from: mockStorageFrom },
  }),
}));

vi.mock('@/lib/waiver-pdf', () => ({
  buildWaiverPdf: vi.fn(async () => new Uint8Array([1, 2, 3])),
}));

import { signWaiver } from '@/services/waivers';

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'insert', 'update', 'order', 'limit']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  return builder;
}

const waiverRow = {
  id: 'w1',
  title: 'Waiver',
  body: 'text',
  expires_after_days: 30,
  version: 1,
};

describe('signWaiver', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockStorageFrom.mockReset();
    mockStorageFrom.mockReturnValue({
      upload: vi.fn(async () => ({ error: null })),
    });
  });

  it('rejects when a valid signature already exists', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    mockFrom
      .mockReturnValueOnce(chain({ data: waiverRow, error: null }))
      .mockReturnValueOnce(chain({ data: { email: 'm@example.com' }, error: null }))
      .mockReturnValueOnce(chain({ data: { name: 'Gym' }, error: null }))
      .mockReturnValueOnce(
        chain({
          data: { id: 'sig-1', expires_at: future, waiver_version: 1, signed_at: new Date().toISOString() },
          error: null,
        })
      );

    await expect(
      signWaiver({
        waiverId: 'w1',
        memberId: 'm1',
        gymId: 'g1',
        signedName: 'Ada Lovelace',
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('inserts a new immutable signature when prior signature expired', async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    mockFrom
      .mockReturnValueOnce(chain({ data: waiverRow, error: null }))
      .mockReturnValueOnce(chain({ data: { email: 'm@example.com' }, error: null }))
      .mockReturnValueOnce(chain({ data: { name: 'Gym' }, error: null }))
      .mockReturnValueOnce(
        chain({
          data: { id: 'sig-old', expires_at: past, waiver_version: 1, signed_at: past },
          error: null,
        })
      )
      .mockReturnValueOnce(chain({ error: null }))
      .mockReturnValueOnce(chain({ data: null, error: null }));

    const result = await signWaiver({
      waiverId: 'w1',
      memberId: 'm1',
      gymId: 'g1',
      signedName: 'Ada Lovelace',
    });

    expect(result.signatureId).toBeTruthy();
    expect(result.signatureId).not.toBe('sig-old');
  });

  it('inserts a new signature when none exists', async () => {
    mockFrom
      .mockReturnValueOnce(
        chain({ data: { ...waiverRow, expires_after_days: null }, error: null })
      )
      .mockReturnValueOnce(chain({ data: { email: 'm@example.com' }, error: null }))
      .mockReturnValueOnce(chain({ data: { name: 'Gym' }, error: null }))
      .mockReturnValueOnce(chain({ data: null, error: null }))
      .mockReturnValueOnce(chain({ error: null }))
      .mockReturnValueOnce(chain({ data: null, error: null }));

    const result = await signWaiver({
      waiverId: 'w1',
      memberId: 'm1',
      gymId: 'g1',
      signedName: 'Ada Lovelace',
    });

    expect(result.signatureId).toBeTruthy();
  });
});

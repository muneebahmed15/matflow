import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

import { getGymSettings, updateGymSettings } from '@/services/gym';

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'update']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(async () => result);
  builder.maybeSingle = vi.fn(async () => result);
  return builder;
}

describe('gym service', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('loads gym settings', async () => {
    mockFrom.mockReturnValueOnce(
      chain({
        data: { id: 'g1', name: 'Test Gym', slug: 'test-gym', kiosk_enabled: true },
        error: null,
      })
    );

    const settings = await getGymSettings('g1');
    expect(settings.name).toBe('Test Gym');
    expect(settings.kiosk_enabled).toBe(true);
  });

  it('updates gym settings with normalized slug', async () => {
    mockFrom.mockReturnValueOnce(
      chain({
        data: { id: 'g1', name: 'New Name', slug: 'new-name', kiosk_enabled: false },
        error: null,
      })
    );

    const settings = await updateGymSettings('g1', {
      name: 'New Name',
      slug: 'New Name!!!',
      kioskEnabled: false,
    });

    expect(settings.slug).toBe('new-name');
  });
});

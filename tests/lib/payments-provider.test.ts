import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

import { getPaymentProviderForGym, StripePaymentProvider } from '@/lib/payments/provider';

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'insert', 'update']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  return builder;
}

describe('StripePaymentProvider', () => {
  it('has name stripe', () => {
    expect(new StripePaymentProvider().name).toBe('stripe');
  });
});

describe('getPaymentProviderForGym', () => {
  beforeEach(() => mockFrom.mockReset());

  it('returns stripe provider by default', async () => {
    mockFrom.mockReturnValueOnce(
      chain({ data: { payment_provider: 'stripe', stripe_only: true } })
    );
    const provider = await getPaymentProviderForGym('g1');
    expect(provider.name).toBe('stripe');
  });
});

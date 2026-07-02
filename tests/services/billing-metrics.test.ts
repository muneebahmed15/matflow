import { describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

import { computeBillingMetrics } from '@/services/billing-metrics';

describe('computeBillingMetrics', () => {
  it('calculates MRR from active subscriptions', async () => {
    let subCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        subCalls++;
        if (subCalls === 1) {
          return {
            select: () => ({
              eq: () => ({
                in: () =>
                  Promise.resolve({
                    data: [
                      { id: '1', status: 'active', plans: { price_cents: 10000, interval: 'month' } },
                      { id: '2', status: 'active', plans: { price_cents: 120000, interval: 'year' } },
                    ],
                  }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ count: 1 }),
            }),
          }),
        };
      }
      if (table === 'families') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ count: 2 }),
          }),
        };
      }
      return {};
    });

    const metrics = await computeBillingMetrics('gym-1');
    expect(metrics.mrrCents).toBe(20000);
    expect(metrics.activeSubscriptions).toBe(2);
    expect(metrics.pastDueSubscriptions).toBe(1);
    expect(metrics.familyCount).toBe(2);
  });
});

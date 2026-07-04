import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

import {
  churnRate,
  createManualSubscription,
  exportGymInvoicesCsv,
  getRevenueMetrics,
  listGymInvoices,
  monthlyContributionCents,
} from '@/services/revenue';

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'order', 'insert', 'update', 'not']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  builder.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(resolve({ error: result.error ?? null, data: result.data ?? null }));
  return builder;
}

describe('monthlyContributionCents', () => {
  it('passes through monthly prices', () => {
    expect(monthlyContributionCents(9900, 'month')).toBe(9900);
  });

  it('divides yearly prices by 12', () => {
    expect(monthlyContributionCents(120000, 'year')).toBe(10000);
  });

  it('returns 0 for missing prices', () => {
    expect(monthlyContributionCents(null, 'month')).toBe(0);
  });
});

describe('churnRate', () => {
  it('computes percentage with one decimal', () => {
    expect(churnRate(90, 10)).toBe(10);
    expect(churnRate(2, 1)).toBe(33.3);
  });

  it('returns 0 with no subscriptions', () => {
    expect(churnRate(0, 0)).toBe(0);
  });
});

describe('getRevenueMetrics', () => {
  beforeEach(() => mockFrom.mockReset());

  it('aggregates MRR, past due, and per-plan revenue', async () => {
    const recentCancel = new Date(Date.now() - 5 * 86_400_000).toISOString();
    mockFrom.mockReturnValueOnce(
      chain({
        data: [
          { id: '1', status: 'active', cancelled_at: null, plans: { name: 'Basic', price_cents: 10000, interval: 'month' } },
          { id: '2', status: 'active', cancelled_at: null, plans: { name: 'Basic', price_cents: 10000, interval: 'month' } },
          { id: '3', status: 'trialing', cancelled_at: null, plans: { name: 'Annual', price_cents: 120000, interval: 'year' } },
          { id: '4', status: 'past_due', cancelled_at: null, plans: { name: 'Basic', price_cents: 10000, interval: 'month' } },
          { id: '5', status: 'cancelled', cancelled_at: recentCancel, plans: { name: 'Basic', price_cents: 10000, interval: 'month' } },
        ],
      })
    );

    const metrics = await getRevenueMetrics('g1');
    expect(metrics.mrrCents).toBe(30000);
    expect(metrics.activeSubscriptions).toBe(3);
    expect(metrics.pastDueCount).toBe(1);
    expect(metrics.churnRate30d).toBe(25);
    expect(metrics.revenueByPlan[0]).toEqual({ planName: 'Basic', subscribers: 2, mrrCents: 20000 });
  });
});

describe('createManualSubscription', () => {
  beforeEach(() => mockFrom.mockReset());

  it('rejects when the member already has an active subscription', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'p1', interval: 'month' } }))
      .mockReturnValueOnce(chain({ data: { id: 'm1' } }))
      .mockReturnValueOnce(chain({ data: { id: 'existing-sub' } }));

    await expect(
      createManualSubscription({ gymId: 'g1', memberId: 'm1', planId: 'p1', paymentMethod: 'cash' })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('creates a manual subscription and activates the member', async () => {
    const memberUpdate = chain({ error: null });
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'p1', interval: 'month' } }))
      .mockReturnValueOnce(chain({ data: { id: 'm1' } }))
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ data: { id: 'sub-1' } }))
      .mockReturnValueOnce(memberUpdate);

    const result = await createManualSubscription({
      gymId: 'g1',
      memberId: 'm1',
      planId: 'p1',
      paymentMethod: 'cash',
    });
    expect(result.id).toBe('sub-1');
    expect(memberUpdate.update).toHaveBeenCalledWith({ status: 'active' });
  });
});

describe('listGymInvoices', () => {
  beforeEach(() => mockFrom.mockReset());

  it('returns empty when gym has no Stripe customers', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [] }))
      .mockReturnValueOnce(chain({ data: [] }));

    await expect(listGymInvoices('g1')).resolves.toEqual([]);
  });
});

describe('exportGymInvoicesCsv', () => {
  beforeEach(() => mockFrom.mockReset());

  it('exports CSV header when there are no invoices', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [] }))
      .mockReturnValueOnce(chain({ data: [] }));

    const csv = await exportGymInvoicesCsv('g1');
    expect(csv).toContain('Invoice,Customer,Email,Status,Amount,Date,PDF URL');
    expect(csv.trim().split('\n')).toHaveLength(1);
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockFrom, cancel, update, retrieve, invoicesList, refundsCreate } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  cancel: vi.fn(),
  update: vi.fn(),
  retrieve: vi.fn(),
  invoicesList: vi.fn(),
  refundsCreate: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({ getAdminClient: () => ({ from: mockFrom }) }));
vi.mock('@/lib/stripe', () => ({
  stripe: {
    subscriptions: { cancel, update, retrieve },
    invoices: { list: invoicesList },
    refunds: { create: refundsCreate },
  },
}));
vi.mock('@/services/audit', () => ({ logAuditEvent: vi.fn() }));

import {
  cancelSubscription,
  changeSubscriptionPlan,
  refundLatestSubscriptionPayment,
  setSubscriptionPause,
} from '@/services/stripe-subscriptions';
import { ServiceError } from '@/services/errors';

function chain(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const calls: unknown[][] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ['update', 'insert', 'eq']) {
    builder[method] = (...args: unknown[]) => {
      calls.push(args);
      return builder;
    };
  }
  builder.then = (resolve: (v: typeof result) => void) => Promise.resolve(result).then(resolve);
  builder.__calls = calls;
  return builder as typeof builder & { __calls: unknown[][] };
}

describe('changeSubscriptionPlan', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    retrieve.mockReset();
    update.mockReset();
  });

  it('updates Stripe with proration and syncs plan_id in the database', async () => {
    retrieve.mockResolvedValue({ items: { data: [{ id: 'si_123' }] } });
    update.mockResolvedValue({});
    const dbChain = chain();
    mockFrom.mockReturnValueOnce(dbChain);

    await changeSubscriptionPlan({
      gymId: 'gym-1',
      subscriptionId: 'sub-row-1',
      stripeSubscriptionId: 'sub_stripe_1',
      newStripePriceId: 'price_new',
      newPlanId: 'plan-new',
    });

    expect(retrieve).toHaveBeenCalledWith('sub_stripe_1');
    expect(update).toHaveBeenCalledWith('sub_stripe_1', {
      items: [{ id: 'si_123', price: 'price_new' }],
      proration_behavior: 'create_prorations',
    });
    expect(dbChain.__calls[0][0]).toMatchObject({ plan_id: 'plan-new' });
  });

  it('throws when Stripe subscription has no billable items', async () => {
    retrieve.mockResolvedValue({ items: { data: [] } });

    await expect(
      changeSubscriptionPlan({
        gymId: 'gym-1',
        subscriptionId: 'sub-row-1',
        stripeSubscriptionId: 'sub_stripe_1',
        newStripePriceId: 'price_new',
        newPlanId: 'plan-new',
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('cancelSubscription', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    cancel.mockReset();
    update.mockReset();
  });

  it('cancels immediately via Stripe and marks the row cancelled', async () => {
    const dbChain = chain();
    mockFrom.mockReturnValueOnce(dbChain);
    cancel.mockResolvedValue({});

    await cancelSubscription({
      gymId: 'gym-1',
      subscriptionId: 'sub-row-1',
      stripeSubscriptionId: 'sub_stripe_1',
      cancelImmediately: true,
    });

    expect(cancel).toHaveBeenCalledWith('sub_stripe_1');
    expect(update).not.toHaveBeenCalled();
    expect(dbChain.__calls[0][0]).toMatchObject({ status: 'cancelled' });
  });

  it('schedules cancellation at period end via Stripe update, keeping status active with cancelled_at set', async () => {
    const dbChain = chain();
    mockFrom.mockReturnValueOnce(dbChain);
    update.mockResolvedValue({});

    await cancelSubscription({
      gymId: 'gym-1',
      subscriptionId: 'sub-row-1',
      stripeSubscriptionId: 'sub_stripe_1',
      cancelImmediately: false,
    });

    expect(update).toHaveBeenCalledWith('sub_stripe_1', { cancel_at_period_end: true });
    expect(cancel).not.toHaveBeenCalled();
    expect(dbChain.__calls[0][0]).toMatchObject({ status: 'active' });
    expect((dbChain.__calls[0][0] as { cancelled_at: string }).cancelled_at).toBeTruthy();
  });

  it('throws a ServiceError when the database update fails', async () => {
    mockFrom.mockReturnValueOnce(chain({ error: { message: 'db down' } }));
    cancel.mockResolvedValue({});

    await expect(
      cancelSubscription({
        gymId: 'gym-1',
        subscriptionId: 'sub-row-1',
        stripeSubscriptionId: 'sub_stripe_1',
        cancelImmediately: true,
      })
    ).rejects.toBeInstanceOf(ServiceError);
  });
});

describe('setSubscriptionPause', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    update.mockReset();
  });

  it('pauses collection and marks the row paused', async () => {
    const dbChain = chain();
    mockFrom.mockReturnValueOnce(dbChain);
    update.mockResolvedValue({});

    await setSubscriptionPause({
      gymId: 'gym-1',
      subscriptionId: 'sub-row-1',
      stripeSubscriptionId: 'sub_stripe_1',
      action: 'pause',
    });

    expect(update).toHaveBeenCalledWith('sub_stripe_1', { pause_collection: { behavior: 'void' } });
    expect(dbChain.__calls[0][0]).toMatchObject({ status: 'paused' });
  });

  it('resumes collection and marks the row active again', async () => {
    const dbChain = chain();
    mockFrom.mockReturnValueOnce(dbChain);
    update.mockResolvedValue({});

    await setSubscriptionPause({
      gymId: 'gym-1',
      subscriptionId: 'sub-row-1',
      stripeSubscriptionId: 'sub_stripe_1',
      action: 'resume',
    });

    expect(update).toHaveBeenCalledWith('sub_stripe_1', { pause_collection: null });
    expect(dbChain.__calls[0][0]).toMatchObject({ status: 'active', paused_at: null });
  });
});

describe('refundLatestSubscriptionPayment', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    invoicesList.mockReset();
    refundsCreate.mockReset();
  });

  it('throws 404 when there is no payment to refund', async () => {
    invoicesList.mockResolvedValue({ data: [] });

    await expect(
      refundLatestSubscriptionPayment({
        gymId: 'gym-1',
        subscriptionId: 'sub-row-1',
        stripeSubscriptionId: 'sub_stripe_1',
        issuedBy: 'user-1',
      })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('issues a refund and records it once a payment intent is found', async () => {
    invoicesList.mockResolvedValue({
      data: [{ payment_intent: 'pi_123' }],
    });
    refundsCreate.mockResolvedValue({ id: 're_123', amount: 5000 });
    const dbChain = chain();
    mockFrom.mockReturnValueOnce(dbChain);

    const result = await refundLatestSubscriptionPayment({
      gymId: 'gym-1',
      subscriptionId: 'sub-row-1',
      stripeSubscriptionId: 'sub_stripe_1',
      memberId: 'member-1',
      amountCents: 5000,
      issuedBy: 'user-1',
    });

    expect(refundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_123', amount: 5000 })
    );
    expect(result).toEqual({ refundId: 're_123', amountCents: 5000 });
    expect(dbChain.__calls[0][0]).toMatchObject({ stripe_refund_id: 're_123' });
  });
});

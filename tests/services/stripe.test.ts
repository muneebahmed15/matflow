import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockStripeUpdate = vi.fn();
const mockStripeCancel = vi.fn();
const mockInvoicesList = vi.fn();
const mockRefundsCreate = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    subscriptions: {
      update: (...args: unknown[]) => mockStripeUpdate(...args),
      cancel: (...args: unknown[]) => mockStripeCancel(...args),
      retrieve: vi.fn(),
    },
    invoices: { list: (...args: unknown[]) => mockInvoicesList(...args) },
    refunds: { create: (...args: unknown[]) => mockRefundsCreate(...args) },
  },
}));

import {
  claimStripeWebhookEvent,
  markStripeWebhookProcessed,
} from '@/services/stripe-webhook';
import {
  cancelSubscription,
  setSubscriptionPause,
} from '@/services/stripe-subscriptions';

function chain(result: { data?: unknown; error?: { message: string; code?: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'update', 'insert', 'delete']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  builder.insert = vi.fn(async () => result);
  builder.then = (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve);
  return builder;
}

describe('stripe webhook idempotency', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockStripeUpdate.mockReset();
    mockStripeCancel.mockReset();
  });

  it('returns duplicate when event already processed', async () => {
    mockFrom.mockReturnValueOnce(
      chain({ data: { id: 'evt_1', status: 'processed' } })
    );

    await expect(claimStripeWebhookEvent('evt_1', 'checkout.session.completed')).resolves.toBe(
      'duplicate'
    );
  });

  it('claims a new event', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ error: null }));

    await expect(claimStripeWebhookEvent('evt_2', 'invoice.payment_failed')).resolves.toBe(
      'claimed'
    );
  });

  it('marks event processed', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: { id: 'evt_3' }, error: null }));
    await expect(markStripeWebhookProcessed('evt_3')).resolves.toBeUndefined();
  });
});

describe('stripe subscription service', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockStripeUpdate.mockReset();
    mockStripeCancel.mockReset();
  });

  it('cancels at period end by default', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: { id: 'sub-1' }, error: null }));
    mockStripeUpdate.mockResolvedValue({});

    await cancelSubscription({
      gymId: 'gym-1',
      subscriptionId: 'sub-1',
      stripeSubscriptionId: 'sub_stripe_1',
      reason: 'Moving away',
      cancelImmediately: false,
    });

    expect(mockStripeUpdate).toHaveBeenCalledWith('sub_stripe_1', {
      cancel_at_period_end: true,
    });
    expect(mockStripeCancel).not.toHaveBeenCalled();
  });

  it('pauses collection in Stripe', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: { id: 'sub-1' }, error: null }));
    mockStripeUpdate.mockResolvedValue({});

    await setSubscriptionPause({
      gymId: 'gym-1',
      subscriptionId: 'sub-1',
      stripeSubscriptionId: 'sub_stripe_1',
      action: 'pause',
      reason: 'Injury',
    });

    expect(mockStripeUpdate).toHaveBeenCalledWith('sub_stripe_1', {
      pause_collection: { behavior: 'void' },
    });
  });
});

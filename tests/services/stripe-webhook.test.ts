import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockFrom, retrieveSubscription } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  retrieveSubscription: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: { subscriptions: { retrieve: retrieveSubscription } },
}));

import { handleStripeWebhookEvent } from '@/services/stripe-webhook';

/** Chainable query builder that records calls per method so tests can assert on payloads. */
function chain(result: { data?: unknown; error?: unknown } = { data: null }) {
  const calls: Record<string, unknown[][]> = {};
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'update', 'insert', 'upsert', 'order', 'limit'];
  for (const method of methods) {
    builder[method] = (...args: unknown[]) => {
      calls[method] = calls[method] ?? [];
      calls[method].push(args);
      return builder;
    };
  }
  builder.maybeSingle = async () => result;
  builder.single = async () => result;
  builder.then = (resolve: (v: typeof result) => void) => Promise.resolve(result).then(resolve);
  builder.__calls = calls;
  return builder as typeof builder & { __calls: typeof calls };
}

describe('handleStripeWebhookEvent', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    retrieveSubscription.mockReset();
  });

  describe('checkout.session.completed', () => {
    function stubTables(subscriptionStatus: string) {
      const membersLookup = chain({ data: { id: 'member-1' } });
      const plansLookup = chain({ data: { id: 'plan-1' } });
      const subscriptionsUpsert = chain({});
      const membersUpdate = chain({});

      // First 'members' call is the lookup; subsequent 'members' calls hit the update stub.
      let membersCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'members') {
          membersCallCount += 1;
          return membersCallCount === 1 ? membersLookup : membersUpdate;
        }
        if (table === 'plans') return plansLookup;
        if (table === 'subscriptions') return subscriptionsUpsert;
        throw new Error(`unexpected table ${table}`);
      });

      retrieveSubscription.mockResolvedValue({
        status: subscriptionStatus,
        items: { data: [{ price: { id: 'price_1' }, current_period_end: 1750000000 }] },
      });

      return { subscriptionsUpsert, membersUpdate };
    }

    it('sets the subscription and member status from the retrieved Stripe subscription status', async () => {
      const { subscriptionsUpsert, membersUpdate } = stubTables('active');

      await handleStripeWebhookEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { member_id: 'member-1', gym_id: 'gym-1' },
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      } as never);

      expect(subscriptionsUpsert.__calls.upsert[0][0]).toMatchObject({ status: 'active' });
      expect(membersUpdate.__calls.update[0][0]).toEqual({ status: 'active' });
    });

    it('does not hardcode "active" when the subscription is already past_due at checkout completion', async () => {
      const { subscriptionsUpsert, membersUpdate } = stubTables('past_due');

      await handleStripeWebhookEvent({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { member_id: 'member-1', gym_id: 'gym-1' },
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      } as never);

      expect(subscriptionsUpsert.__calls.upsert[0][0]).toMatchObject({ status: 'past_due' });
      expect(membersUpdate.__calls.update[0][0]).toEqual({ status: 'past_due' });
    });

    it('does nothing when required metadata is missing', async () => {
      await handleStripeWebhookEvent({
        type: 'checkout.session.completed',
        data: { object: { metadata: {}, subscription: null, customer: 'cus_123' } },
      } as never);

      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.updated', () => {
    it('maps active Stripe status to an active member and updates both rows', async () => {
      const subUpdate = chain({ data: { member_id: 'member-1' } });
      const membersUpdate = chain({});
      mockFrom.mockImplementation((table: string) =>
        table === 'subscriptions' ? subUpdate : membersUpdate
      );

      await handleStripeWebhookEvent({
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_123', status: 'active', items: { data: [{ current_period_end: 1750000000 }] } } },
      } as never);

      expect(subUpdate.__calls.update[0][0]).toMatchObject({ status: 'active' });
      expect(membersUpdate.__calls.update[0][0]).toEqual({ status: 'active' });
    });

    it('maps past_due Stripe status to a past_due member', async () => {
      const subUpdate = chain({ data: { member_id: 'member-1' } });
      const membersUpdate = chain({});
      mockFrom.mockImplementation((table: string) =>
        table === 'subscriptions' ? subUpdate : membersUpdate
      );

      await handleStripeWebhookEvent({
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_123', status: 'past_due', items: { data: [{}] } } },
      } as never);

      expect(membersUpdate.__calls.update[0][0]).toEqual({ status: 'past_due' });
    });

    it('leaves members.status unchanged for an unmapped Stripe status instead of writing something wrong', async () => {
      const subUpdate = chain({ data: { member_id: 'member-1' } });
      const membersUpdate = chain({});
      mockFrom.mockImplementation((table: string) =>
        table === 'subscriptions' ? subUpdate : membersUpdate
      );

      await handleStripeWebhookEvent({
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_123', status: 'incomplete', items: { data: [{}] } } },
      } as never);

      expect(subUpdate.__calls.update[0][0]).toMatchObject({ status: 'incomplete' });
      expect(membersUpdate.__calls.update).toBeUndefined();
    });
  });

  describe('customer.subscription.deleted', () => {
    it('cancels the subscription row and sets the member inactive', async () => {
      const subUpdate = chain({ data: { member_id: 'member-1' } });
      const membersUpdate = chain({});
      mockFrom.mockImplementation((table: string) =>
        table === 'subscriptions' ? subUpdate : membersUpdate
      );

      await handleStripeWebhookEvent({
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_123' } },
      } as never);

      expect(subUpdate.__calls.update[0][0]).toMatchObject({ status: 'cancelled' });
      expect(membersUpdate.__calls.update[0][0]).toEqual({ status: 'inactive' });
    });
  });

  describe('invoice.payment_failed', () => {
    it('marks the subscription and member past_due', async () => {
      const subUpdate = chain({ data: { member_id: 'member-1' } });
      const membersUpdate = chain({});
      mockFrom.mockImplementation((table: string) =>
        table === 'subscriptions' ? subUpdate : membersUpdate
      );

      await handleStripeWebhookEvent({
        type: 'invoice.payment_failed',
        data: {
          object: { parent: { subscription_details: { subscription: 'sub_123' } } },
        },
      } as never);

      expect(subUpdate.__calls.update[0][0]).toEqual({ status: 'past_due' });
      expect(membersUpdate.__calls.update[0][0]).toEqual({ status: 'past_due' });
    });

    it('does nothing when the invoice has no associated subscription', async () => {
      await handleStripeWebhookEvent({
        type: 'invoice.payment_failed',
        data: { object: { parent: { subscription_details: { subscription: null } } } },
      } as never);

      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  it('ignores unhandled event types', async () => {
    await handleStripeWebhookEvent({ type: 'customer.created', data: { object: {} } } as never);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

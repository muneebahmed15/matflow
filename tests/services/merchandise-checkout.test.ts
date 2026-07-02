import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

import { prepareShopOrder, completeShopOrder } from '@/services/merchandise';

describe('prepareShopOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates pending order without decrementing inventory', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'prod-1',
                      name: 'Gi',
                      price_cents: 5000,
                      inventory_count: 5,
                      is_active: true,
                    },
                  }),
              }),
            }),
          }),
        };
      }
      if (table === 'orders') {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'order-1' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'order_items') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });

    const result = await prepareShopOrder({
      gymId: 'gym-1',
      customerEmail: 'buyer@example.com',
      items: [{ productId: 'prod-1', quantity: 1 }],
    });

    expect(result.orderId).toBe('order-1');
    expect(result.totalCents).toBe(5000);
  });
});

describe('completeShopOrder', () => {
  it('marks order paid and decrements inventory', async () => {
    let productInventory = 5;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'orders') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'order-1', status: 'pending' } }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }),
        };
      }
      if (table === 'order_items') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ product_id: 'prod-1', quantity: 1 }] }),
          }),
        };
      }
      if (table === 'products') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { inventory_count: productInventory } }),
            }),
          }),
          update: (payload: { inventory_count: number }) => ({
            eq: () => {
              productInventory = payload.inventory_count;
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      return {};
    });

    await completeShopOrder('gym-1', 'order-1');
    expect(productInventory).toBe(4);
  });
});

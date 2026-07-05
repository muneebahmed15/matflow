import { describe, expect, it } from 'vitest';
import { formatShopOrdersForQuickBooks } from '@/lib/quickbooks-export';

describe('formatShopOrdersForQuickBooks', () => {
  it('formats paid orders with line items as CSV', () => {
    const csv = formatShopOrdersForQuickBooks([
      {
        id: 'order-abc12345',
        created_at: '2026-07-04T12:00:00.000Z',
        customer_email: 'buyer@example.com',
        status: 'paid',
        total_cents: 7500,
        order_items: [
          {
            quantity: 1,
            unit_price_cents: 5000,
            products: { name: 'Gi' },
          },
          {
            quantity: 1,
            unit_price_cents: 2500,
            products: { name: 'Belt' },
          },
        ],
      },
    ]);

    expect(csv.split('\n')[0]).toContain('Date,Customer,Order ID');
    expect(csv).toContain('buyer@example.com');
    expect(csv).toContain('Gi');
    expect(csv).toContain('50.00');
    expect(csv).toContain('Belt');
  });

  it('escapes commas in customer names', () => {
    const csv = formatShopOrdersForQuickBooks([
      {
        id: 'order-xyz',
        created_at: '2026-07-04T12:00:00.000Z',
        customer_email: 'a,b@example.com',
        status: 'fulfilled',
        total_cents: 1000,
        order_items: [],
      },
    ]);

    expect(csv).toContain('"a,b@example.com"');
  });
});

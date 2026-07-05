import { describe, expect, it } from 'vitest';
import { buildPackingSlipPdf } from '@/lib/packing-slip-pdf';

describe('buildPackingSlipPdf', () => {
  it('returns a non-empty PDF byte array', async () => {
    const bytes = await buildPackingSlipPdf({
      gymName: 'East Coast MMA',
      orderId: 'order-abc-123',
      customerEmail: 'buyer@example.com',
      fulfillmentType: 'ship',
      shippingAddress: {
        name: 'Jane Doe',
        line1: '123 Main St',
        city: 'Boston',
        state: 'MA',
        postal_code: '02101',
      },
      items: [{ name: 'Academy Gi A2', quantity: 1, unitPriceCents: 12900 }],
      totalCents: 12900,
      createdAt: new Date().toISOString(),
    });
    expect(bytes.length).toBeGreaterThan(100);
    expect(bytes[0]).toBe(0x25);
    expect(bytes[1]).toBe(0x50);
  });
});

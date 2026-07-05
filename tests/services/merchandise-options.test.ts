import { describe, expect, it } from 'vitest';
import {
  applyDiscountToLineItems,
  calculateShopPricing,
} from '@/lib/shop-pricing';

describe('calculateShopPricing', () => {
  it('applies member discount and flat tax', () => {
    const result = calculateShopPricing({
      subtotalCents: 10000,
      memberDiscountPercent: 10,
      flatTaxCents: 250,
    });
    expect(result.discountCents).toBe(1000);
    expect(result.taxCents).toBe(250);
    expect(result.totalCents).toBe(9250);
  });

  it('clamps discount percent to 0–100', () => {
    const result = calculateShopPricing({
      subtotalCents: 5000,
      memberDiscountPercent: 150,
    });
    expect(result.discountCents).toBe(5000);
    expect(result.totalCents).toBe(0);
  });
});

describe('applyDiscountToLineItems', () => {
  it('scales line prices to match discounted subtotal', () => {
    const lines = [
      { priceCents: 6000, quantity: 1 },
      { priceCents: 4000, quantity: 1 },
    ];
    const adjusted = applyDiscountToLineItems(lines, 1000);
    const total = adjusted.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
    expect(total).toBe(9000);
  });
});

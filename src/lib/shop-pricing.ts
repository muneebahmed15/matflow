export type ShopPricingInput = {
  subtotalCents: number;
  memberDiscountPercent?: number;
  flatTaxCents?: number;
};

export type ShopPricingResult = {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
};

export function calculateShopPricing(input: ShopPricingInput): ShopPricingResult {
  const subtotalCents = Math.max(0, input.subtotalCents);
  const discountPercent = Math.min(100, Math.max(0, input.memberDiscountPercent ?? 0));
  const discountCents = Math.round(subtotalCents * (discountPercent / 100));
  const taxCents = Math.max(0, input.flatTaxCents ?? 0);
  const totalCents = Math.max(0, subtotalCents - discountCents + taxCents);
  return { subtotalCents, discountCents, taxCents, totalCents };
}

/** Scale line item unit prices so their sum matches a target subtotal after discount. */
export function applyDiscountToLineItems(
  lines: { priceCents: number; quantity: number }[],
  discountCents: number
): { priceCents: number; quantity: number }[] {
  if (discountCents <= 0 || lines.length === 0) return lines;

  const subtotal = lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
  if (subtotal <= 0) return lines;

  const target = Math.max(0, subtotal - discountCents);
  const ratio = target / subtotal;
  const adjusted = lines.map((line) => ({
    ...line,
    priceCents: Math.max(0, Math.round(line.priceCents * ratio)),
  }));

  const adjustedTotal = adjusted.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
  const drift = target - adjustedTotal;
  if (drift !== 0 && adjusted.length > 0) {
    adjusted[0] = {
      ...adjusted[0],
      priceCents: Math.max(0, adjusted[0].priceCents + Math.round(drift / adjusted[0].quantity)),
    };
  }

  return adjusted;
}

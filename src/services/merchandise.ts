import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { sendTransactionalEmail } from '@/lib/email/resend';
import {
  applyDiscountToLineItems,
  calculateShopPricing,
} from '@/lib/shop-pricing';
import type { ShippingAddress } from '@/lib/packing-slip-pdf';

export type Product = {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price_cents: number;
  category: string;
  image_url: string | null;
  gallery_urls: string[];
  inventory_count: number;
  is_active: boolean;
  members_only: boolean;
  created_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  gym_id: string;
  label: string;
  sku: string | null;
  price_cents: number | null;
  inventory_count: number;
};

export async function listProducts(
  gymId: string,
  activeOnly = false,
  options?: { category?: string; membersOnly?: boolean }
): Promise<Product[]> {
  const admin = getAdminClient();
  let query = admin.from('products').select('*').eq('gym_id', gymId).order('name');
  if (activeOnly) query = query.eq('is_active', true);
  if (options?.category) query = query.eq('category', options.category);
  if (options?.membersOnly !== undefined) query = query.eq('members_only', options.membersOnly);
  const { data, error } = await query;
  if (error) throw new ServiceError(500, error.message);
  return (data ?? []).map(normalizeProduct);
}

export async function getProduct(gymId: string, productId: string): Promise<Product | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('gym_id', gymId)
    .maybeSingle();
  if (error) throw new ServiceError(500, error.message);
  return data ? normalizeProduct(data) : null;
}

function normalizeProduct(row: Record<string, unknown>): Product {
  const gallery = row.gallery_urls;
  return {
    ...(row as Product),
    gallery_urls: Array.isArray(gallery) ? gallery.filter((u): u is string => typeof u === 'string') : [],
    members_only: Boolean(row.members_only),
  };
}

export async function createProduct(input: {
  gymId: string;
  name: string;
  description?: string;
  sku?: string;
  priceCents: number;
  category?: string;
  imageUrl?: string;
  inventoryCount?: number;
  membersOnly?: boolean;
}): Promise<Product> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('products')
    .insert({
      gym_id: input.gymId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      sku: input.sku?.trim() || null,
      price_cents: input.priceCents,
      category: input.category ?? 'apparel',
      image_url: input.imageUrl?.trim() || null,
      inventory_count: input.inventoryCount ?? 0,
      members_only: input.membersOnly ?? false,
    })
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return normalizeProduct(data as Record<string, unknown>);
}

export async function listProductVariants(gymId: string, productId: string): Promise<ProductVariant[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('product_variants')
    .select('*')
    .eq('gym_id', gymId)
    .eq('product_id', productId)
    .order('label');
  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as ProductVariant[];
}

export async function createProductVariant(input: {
  gymId: string;
  productId: string;
  label: string;
  sku?: string;
  priceCents?: number | null;
  inventoryCount?: number;
}): Promise<ProductVariant> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('product_variants')
    .insert({
      gym_id: input.gymId,
      product_id: input.productId,
      label: input.label.trim(),
      sku: input.sku?.trim() || null,
      price_cents: input.priceCents ?? null,
      inventory_count: input.inventoryCount ?? 0,
    })
    .select('*')
    .single();
  if (error) throw new ServiceError(500, error.message);
  return data as ProductVariant;
}

export async function adjustProductStock(input: {
  gymId: string;
  productId: string;
  delta: number;
  reason?: string;
  actorId?: string | null;
}): Promise<number> {
  const admin = getAdminClient();
  const { data: product } = await admin
    .from('products')
    .select('inventory_count')
    .eq('id', input.productId)
    .eq('gym_id', input.gymId)
    .maybeSingle();
  if (!product) throw new ServiceError(404, 'Product not found');

  const next = Math.max(0, (product.inventory_count ?? 0) + input.delta);
  const { error } = await admin
    .from('products')
    .update({ inventory_count: next })
    .eq('id', input.productId);
  if (error) throw new ServiceError(500, error.message);

  await admin.from('stock_adjustments').insert({
    gym_id: input.gymId,
    product_id: input.productId,
    delta: input.delta,
    reason: input.reason ?? null,
    actor_id: input.actorId ?? null,
  });

  return next;
}

export async function getShopRevenueByProduct(gymId: string): Promise<
  { productId: string; name: string; unitsSold: number; revenueCents: number }[]
> {
  const admin = getAdminClient();
  const { data: items, error } = await admin
    .from('order_items')
    .select('quantity, unit_price_cents, product_id, products(name), orders!inner(gym_id, status)')
    .eq('orders.gym_id', gymId)
    .in('orders.status', ['paid', 'fulfilled']);

  if (error) throw new ServiceError(500, error.message);

  const map = new Map<string, { name: string; unitsSold: number; revenueCents: number }>();
  for (const row of items ?? []) {
    const item = row as {
      quantity: number;
      unit_price_cents: number;
      product_id: string;
      products: { name: string } | { name: string }[] | null;
    };
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    const name = product?.name ?? 'Product';
    const existing = map.get(item.product_id) ?? { name, unitsSold: 0, revenueCents: 0 };
    existing.unitsSold += item.quantity;
    existing.revenueCents += item.quantity * item.unit_price_cents;
    map.set(item.product_id, existing);
  }

  return [...map.entries()]
    .map(([productId, stats]) => ({ productId, ...stats }))
    .sort((a, b) => b.revenueCents - a.revenueCents);
}

export async function updateProductInventory(
  gymId: string,
  productId: string,
  inventoryCount: number
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('products')
    .update({ inventory_count: inventoryCount })
    .eq('id', productId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

export async function listOrders(gymId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('orders')
    .select('*, order_items(*, products(name))')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export async function createOrder(input: {
  gymId: string;
  memberId?: string;
  customerEmail?: string;
  items: { productId: string; quantity: number }[];
}): Promise<{ orderId: string; totalCents: number }> {
  const admin = getAdminClient();
  let totalCents = 0;
  const lineItems: { product_id: string; quantity: number; unit_price_cents: number }[] = [];

  for (const item of input.items) {
    const { data: product } = await admin
      .from('products')
      .select('id, price_cents, inventory_count, is_active')
      .eq('id', item.productId)
      .eq('gym_id', input.gymId)
      .maybeSingle();

    if (!product?.is_active) throw new ServiceError(400, 'Product unavailable');
    if (product.inventory_count < item.quantity) {
      throw new ServiceError(400, 'Insufficient inventory');
    }

    totalCents += product.price_cents * item.quantity;
    lineItems.push({
      product_id: product.id,
      quantity: item.quantity,
      unit_price_cents: product.price_cents,
    });
  }

  const { data: order, error } = await admin
    .from('orders')
    .insert({
      gym_id: input.gymId,
      member_id: input.memberId ?? null,
      customer_email: input.customerEmail ?? null,
      total_cents: totalCents,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !order) throw new ServiceError(500, error?.message ?? 'Order failed');

  for (const line of lineItems) {
    await admin.from('order_items').insert({
      order_id: order.id,
      product_id: line.product_id,
      quantity: line.quantity,
      unit_price_cents: line.unit_price_cents,
    });

    const { data: p } = await admin
      .from('products')
      .select('inventory_count')
      .eq('id', line.product_id)
      .single();

    await admin
      .from('products')
      .update({ inventory_count: (p?.inventory_count ?? 0) - line.quantity })
      .eq('id', line.product_id);
  }

  return { orderId: order.id, totalCents };
}

export type ShopLineItem = { productId: string; quantity: number };

async function getGymShopSettings(gymId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gyms')
    .select('shop_member_discount_percent, shop_flat_tax_cents')
    .eq('id', gymId)
    .single();
  if (error || !data) throw new ServiceError(404, 'Gym not found');
  return {
    memberDiscountPercent: data.shop_member_discount_percent ?? 0,
    flatTaxCents: data.shop_flat_tax_cents ?? 0,
  };
}

/** Create a pending order without decrementing inventory (reserved at payment). */
export async function prepareShopOrder(input: {
  gymId: string;
  memberId?: string;
  customerEmail?: string;
  items: ShopLineItem[];
  fulfillmentType?: 'pickup' | 'ship';
  shippingAddress?: ShippingAddress | null;
}): Promise<{
  orderId: string;
  totalCents: number;
  taxCents: number;
  discountCents: number;
  lineItems: { name: string; priceCents: number; quantity: number }[];
}> {
  const admin = getAdminClient();
  const shopSettings = await getGymShopSettings(input.gymId);
  const fulfillmentType = input.fulfillmentType ?? 'pickup';

  if (fulfillmentType === 'ship') {
    const addr = input.shippingAddress;
    if (!addr?.line1?.trim() || !addr.city?.trim() || !addr.state?.trim() || !addr.postal_code?.trim()) {
      throw new ServiceError(400, 'Shipping address is required for ship orders');
    }
  }

  let subtotalCents = 0;
  const lineItems: { product_id: string; quantity: number; unit_price_cents: number }[] = [];
  const stripeLineItems: { name: string; priceCents: number; quantity: number }[] = [];

  for (const item of input.items) {
    const { data: product } = await admin
      .from('products')
      .select('id, name, price_cents, inventory_count, is_active')
      .eq('id', item.productId)
      .eq('gym_id', input.gymId)
      .maybeSingle();

    if (!product?.is_active) throw new ServiceError(400, 'Product unavailable');
    if (product.inventory_count < item.quantity) {
      throw new ServiceError(400, `Insufficient stock for ${product.name}`);
    }

    subtotalCents += product.price_cents * item.quantity;
    lineItems.push({
      product_id: product.id,
      quantity: item.quantity,
      unit_price_cents: product.price_cents,
    });
    stripeLineItems.push({
      name: product.name,
      priceCents: product.price_cents,
      quantity: item.quantity,
    });
  }

  const memberDiscountPercent =
    input.memberId && shopSettings.memberDiscountPercent > 0
      ? shopSettings.memberDiscountPercent
      : 0;
  const pricing = calculateShopPricing({
    subtotalCents,
    memberDiscountPercent,
    flatTaxCents: shopSettings.flatTaxCents,
  });

  const discountedStripeLines = applyDiscountToLineItems(stripeLineItems, pricing.discountCents).map(
    (line, i) => ({
      name: stripeLineItems[i].name,
      priceCents: line.priceCents,
      quantity: line.quantity,
    })
  );
  for (let i = 0; i < lineItems.length; i++) {
    lineItems[i].unit_price_cents = discountedStripeLines[i]?.priceCents ?? lineItems[i].unit_price_cents;
  }

  const { data: order, error } = await admin
    .from('orders')
    .insert({
      gym_id: input.gymId,
      member_id: input.memberId ?? null,
      customer_email: input.customerEmail ?? null,
      total_cents: pricing.totalCents,
      status: 'pending',
      fulfillment_type: fulfillmentType,
      shipping_address: fulfillmentType === 'ship' ? input.shippingAddress ?? null : null,
    })
    .select('id')
    .single();

  if (error || !order) throw new ServiceError(500, error?.message ?? 'Order failed');

  for (const line of lineItems) {
    await admin.from('order_items').insert({
      order_id: order.id,
      product_id: line.product_id,
      quantity: line.quantity,
      unit_price_cents: line.unit_price_cents,
    });
  }

  return {
    orderId: order.id,
    totalCents: pricing.totalCents,
    taxCents: pricing.taxCents,
    discountCents: pricing.discountCents,
    lineItems: discountedStripeLines,
  };
}

export async function cancelStalePendingShopOrders(gymId?: string): Promise<number> {
  const admin = getAdminClient();
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  let query = admin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('status', 'pending')
    .lt('created_at', cutoff);

  if (gymId) query = query.eq('gym_id', gymId);

  const { data, error } = await query.select('id');
  if (error) throw new ServiceError(500, error.message);
  return data?.length ?? 0;
}

export async function getInventoryValuation(
  gymId: string
): Promise<{ totalCents: number; skuCount: number }> {
  const admin = getAdminClient();
  const { data: products, error: prodError } = await admin
    .from('products')
    .select('id, price_cents, inventory_count')
    .eq('gym_id', gymId);
  if (prodError) throw new ServiceError(500, prodError.message);

  const { data: variants, error: varError } = await admin
    .from('product_variants')
    .select('product_id, price_cents, inventory_count')
    .eq('gym_id', gymId);
  if (varError) throw new ServiceError(500, varError.message);

  const productPriceById = new Map(
    (products ?? []).map((p) => [p.id as string, p.price_cents as number])
  );

  let totalCents = 0;
  let skuCount = 0;

  for (const product of products ?? []) {
    totalCents += (product.price_cents ?? 0) * (product.inventory_count ?? 0);
    skuCount += 1;
  }

  for (const variant of variants ?? []) {
    const unitPrice =
      variant.price_cents ?? productPriceById.get(variant.product_id as string) ?? 0;
    totalCents += unitPrice * (variant.inventory_count ?? 0);
    skuCount += 1;
  }

  return { totalCents, skuCount };
}

export async function getOrderForPackingSlip(gymId: string, orderId: string) {
  const admin = getAdminClient();
  const { data: order, error } = await admin
    .from('orders')
    .select('*, order_items(*, products(name))')
    .eq('id', orderId)
    .eq('gym_id', gymId)
    .maybeSingle();
  if (error) throw new ServiceError(500, error.message);
  if (!order) throw new ServiceError(404, 'Order not found');
  return order;
}

export async function createPosOrder(input: {
  gymId: string;
  memberId?: string;
  customerEmail?: string;
  items: ShopLineItem[];
}): Promise<{ orderId: string; totalCents: number }> {
  const admin = getAdminClient();
  const shopSettings = await getGymShopSettings(input.gymId);
  let subtotalCents = 0;
  const lineItems: { product_id: string; quantity: number; unit_price_cents: number }[] = [];

  for (const item of input.items) {
    const { data: product } = await admin
      .from('products')
      .select('id, price_cents, inventory_count, is_active')
      .eq('id', item.productId)
      .eq('gym_id', input.gymId)
      .maybeSingle();

    if (!product?.is_active) throw new ServiceError(400, 'Product unavailable');
    if (product.inventory_count < item.quantity) {
      throw new ServiceError(400, 'Insufficient inventory');
    }

    subtotalCents += product.price_cents * item.quantity;
    lineItems.push({
      product_id: product.id,
      quantity: item.quantity,
      unit_price_cents: product.price_cents,
    });
  }

  const memberDiscountPercent =
    input.memberId && shopSettings.memberDiscountPercent > 0
      ? shopSettings.memberDiscountPercent
      : 0;
  const pricing = calculateShopPricing({
    subtotalCents,
    memberDiscountPercent,
    flatTaxCents: shopSettings.flatTaxCents,
  });
  const discountedLines = applyDiscountToLineItems(
    lineItems.map((line) => ({ priceCents: line.unit_price_cents, quantity: line.quantity })),
    pricing.discountCents
  );
  for (let i = 0; i < lineItems.length; i++) {
    lineItems[i].unit_price_cents = discountedLines[i]?.priceCents ?? lineItems[i].unit_price_cents;
  }

  const { data: order, error } = await admin
    .from('orders')
    .insert({
      gym_id: input.gymId,
      member_id: input.memberId ?? null,
      customer_email: input.customerEmail ?? null,
      total_cents: pricing.totalCents,
      status: 'paid',
      fulfillment_type: 'pickup',
    })
    .select('id')
    .single();

  if (error || !order) throw new ServiceError(500, error?.message ?? 'Order failed');

  for (const line of lineItems) {
    await admin.from('order_items').insert({
      order_id: order.id,
      product_id: line.product_id,
      quantity: line.quantity,
      unit_price_cents: line.unit_price_cents,
    });

    const { data: p } = await admin
      .from('products')
      .select('inventory_count')
      .eq('id', line.product_id)
      .single();

    await admin
      .from('products')
      .update({ inventory_count: (p?.inventory_count ?? 0) - line.quantity })
      .eq('id', line.product_id);
  }

  return { orderId: order.id, totalCents: pricing.totalCents };
}

export async function attachCheckoutSessionToOrder(
  gymId: string,
  orderId: string,
  sessionId: string
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('orders')
    .update({ stripe_checkout_session_id: sessionId })
    .eq('id', orderId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

export async function completeShopOrder(gymId: string, orderId: string): Promise<void> {
  const admin = getAdminClient();

  const { data: order } = await admin
    .from('orders')
    .select('id, status, customer_email, total_cents')
    .eq('id', orderId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!order) throw new ServiceError(404, 'Order not found');
  if (order.status === 'paid') return;

  const { data: items } = await admin
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId);

  for (const item of items ?? []) {
    const { data: p } = await admin
      .from('products')
      .select('inventory_count')
      .eq('id', item.product_id)
      .single();

    const next = (p?.inventory_count ?? 0) - item.quantity;
    if (next < 0) throw new ServiceError(400, 'Inventory conflict on payment');

    await admin
      .from('products')
      .update({ inventory_count: next })
      .eq('id', item.product_id);
  }

  await admin
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', orderId)
    .eq('gym_id', gymId);

  if (order.customer_email) {
    try {
      await sendTransactionalEmail({
        to: order.customer_email,
        subject: 'Order confirmed',
        html: `<p>Thank you for your order! Total: $${((order.total_cents ?? 0) / 100).toFixed(2)}. Pick up at the gym.</p>`,
        text: `Thank you for your order! Total: $${((order.total_cents ?? 0) / 100).toFixed(2)}.`,
      });
    } catch {
      // best-effort
    }
  }
}

export async function fulfillOrder(
  gymId: string,
  orderId: string,
  trackingNumber?: string
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('orders')
    .update({
      status: 'fulfilled',
      tracking_number: trackingNumber?.trim() || null,
      fulfilled_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);

  const { data: order } = await admin
    .from('orders')
    .select('customer_email')
    .eq('id', orderId)
    .eq('gym_id', gymId)
    .single();

  if (order?.customer_email) {
    try {
      await sendTransactionalEmail({
        to: order.customer_email,
        subject: 'Your order has shipped',
        html: `<p>Your order is on the way!${
          trackingNumber ? ` Tracking: ${trackingNumber}` : ' Pick up at the gym.'
        }</p>`,
        text: `Your order is fulfilled.${trackingNumber ? ` Tracking: ${trackingNumber}` : ''}`,
      });
    } catch {
      // best-effort
    }
  }
}

export async function listMemberOrders(gymId: string, memberId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('orders')
    .select('*, order_items(*, products(name))')
    .eq('gym_id', gymId)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { sendTransactionalEmail } from '@/lib/email/resend';

export type Product = {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price_cents: number;
  category: string;
  image_url: string | null;
  inventory_count: number;
  is_active: boolean;
  created_at: string;
};

export async function listProducts(gymId: string, activeOnly = false): Promise<Product[]> {
  const admin = getAdminClient();
  let query = admin.from('products').select('*').eq('gym_id', gymId).order('name');
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as Product[];
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
    })
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as Product;
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

/** Create a pending order without decrementing inventory (reserved at payment). */
export async function prepareShopOrder(input: {
  gymId: string;
  memberId?: string;
  customerEmail?: string;
  items: ShopLineItem[];
}): Promise<{
  orderId: string;
  totalCents: number;
  lineItems: { name: string; priceCents: number; quantity: number }[];
}> {
  const admin = getAdminClient();
  let totalCents = 0;
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

    totalCents += product.price_cents * item.quantity;
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
  }

  return { orderId: order.id, totalCents, lineItems: stripeLineItems };
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

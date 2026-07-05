'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';

import {
  listProducts,
  createProduct,
  listOrders,
  fulfillOrder,
  getShopRevenueByProduct,
  createProductVariant,
  adjustProductStock,
  listProductVariants,
  getInventoryValuation,
  createPosOrder,
  getOrderForPackingSlip,
} from '@/services/merchandise';

import { type ActionResult, toActionError } from './_shared';

export async function listProductsAction() {
  try {
    const auth = await requireStaffSession({ capability: 'shop.read' });
    return { ok: true as const, data: await listProducts(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createProductAction(input: {
  name: string;
  description?: string;
  sku?: string;
  priceCents: number;
  category?: string;
  inventoryCount?: number;
  membersOnly?: boolean;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const product = await createProduct({ ...input, gymId: auth.gymId });
    revalidatePath('/shop');
    return { ok: true as const, data: product };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listOrdersAction() {
  try {
    const auth = await requireStaffSession({ capability: 'shop.read' });
    return { ok: true as const, data: await listOrders(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function fulfillOrderAction(orderId: string, trackingNumber?: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await fulfillOrder(auth.gymId, orderId, trackingNumber);
    revalidatePath('/shop');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getShopRevenueAction() {
  try {
    const auth = await requireStaffSession({ capability: 'shop.read' });
    return { ok: true as const, data: await getShopRevenueByProduct(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listProductVariantsAction(productId: string) {
  try {
    const auth = await requireStaffSession({ capability: 'shop.read' });
    return { ok: true as const, data: await listProductVariants(auth.gymId, productId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createProductVariantAction(input: {
  productId: string;
  label: string;
  sku?: string;
  priceCents?: number | null;
  inventoryCount?: number;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const variant = await createProductVariant({ ...input, gymId: auth.gymId });
    revalidatePath('/shop');
    return { ok: true as const, data: variant };
  } catch (error) {
    return toActionError(error);
  }
}

export async function adjustStockAction(input: {
  productId: string;
  delta: number;
  reason?: string;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const next = await adjustProductStock({
      ...input,
      gymId: auth.gymId,
      actorId: auth.user.id,
    });
    revalidatePath('/shop');
    return { ok: true as const, data: { inventoryCount: next } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getInventoryValuationAction() {
  try {
    const auth = await requireStaffSession({ capability: 'shop.read' });
    return { ok: true as const, data: await getInventoryValuation(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createPosOrderAction(input: {
  memberId?: string;
  customerEmail?: string;
  items: { productId: string; quantity: number }[];
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const result = await createPosOrder({ ...input, gymId: auth.gymId });
    revalidatePath('/shop');
    return { ok: true as const, data: result };
  } catch (error) {
    return toActionError(error);
  }
}

export async function downloadPackingSlipAction(
  orderId: string
): Promise<ActionResult<{ base64: string; filename: string }>> {
  try {
    const auth = await requireStaffSession({ capability: 'shop.read' });
    const { getGymSettings } = await import('@/services/gym');
    const { buildPackingSlipPdf } = await import('@/lib/packing-slip-pdf');
    const gym = await getGymSettings(auth.gymId);
    const order = await getOrderForPackingSlip(auth.gymId, orderId);

    const items = (order.order_items ?? []).map(
      (item: {
        quantity: number;
        unit_price_cents: number;
        products: { name: string } | { name: string }[] | null;
      }) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        return {
          name: product?.name ?? 'Product',
          quantity: item.quantity,
          unitPriceCents: item.unit_price_cents,
        };
      }
    );

    const pdf = await buildPackingSlipPdf({
      gymName: gym.name,
      orderId: order.id,
      customerEmail: order.customer_email,
      fulfillmentType: (order.fulfillment_type as 'pickup' | 'ship') ?? 'pickup',
      shippingAddress: order.shipping_address as import('@/lib/packing-slip-pdf').ShippingAddress | null,
      items,
      totalCents: order.total_cents,
      createdAt: order.created_at,
    });

    return {
      ok: true,
      data: {
        base64: Buffer.from(pdf).toString('base64'),
        filename: `packing-slip-${order.id.slice(0, 8)}.pdf`,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

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

'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';























import { listProducts, createProduct, listOrders } from '@/services/merchandise';




import { fulfillOrder } from '@/services/merchandise';











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


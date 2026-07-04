'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';

























import { computeBillingMetrics } from '@/services/billing-metrics';













import { type ActionResult, toActionError } from './_shared';

export async function getRevenueMetricsAction(): Promise<
  ActionResult<import('@/services/revenue').RevenueMetrics>
> {
  try {
    const auth = await requireStaffSession({ capability: 'billing.read' });
    const { getRevenueMetrics } = await import('@/services/revenue');
    const metrics = await getRevenueMetrics(auth.gymId);
    return { ok: true, data: metrics };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listPastDueMembersAction(): Promise<
  ActionResult<import('@/services/revenue').PastDueMember[]>
> {
  try {
    const auth = await requireStaffSession({ capability: 'billing.read' });
    const { listPastDueMembers } = await import('@/services/revenue');
    const rows = await listPastDueMembers(auth.gymId);
    return { ok: true, data: rows };
  } catch (error) {
    return toActionError(error);
  }
}


export async function exportSubscriptionsCsvAction(): Promise<ActionResult<string>> {
  try {
    const auth = await requireStaffSession({ capability: 'billing.read' });
    const { exportSubscriptionsCsv } = await import('@/services/revenue');
    const csv = await exportSubscriptionsCsv(auth.gymId);
    return { ok: true, data: csv };
  } catch (error) {
    return toActionError(error);
  }
}


export async function createManualSubscriptionAction(input: {
  memberId: string;
  planId: string;
  paymentMethod: 'cash' | 'check' | 'other';
}): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await requireStaffSession({ capability: 'billing.write' });
    const { createManualSubscription } = await import('@/services/revenue');
    const result = await createManualSubscription({ ...input, gymId: auth.gymId });
    revalidatePath('/subscriptions');
    return { ok: true, data: result };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getBillingMetricsAction() {
  try {
    const auth = await requireStaffSession({ capability: 'billing.read' });
    return { ok: true as const, data: await computeBillingMetrics(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


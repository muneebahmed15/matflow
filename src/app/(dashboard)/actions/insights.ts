'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';





















import { getLatestSnapshot, saveDailySnapshot, listDigestHistory } from '@/services/business-assistant';



import { listAuditEvents } from '@/services/audit';














import { type ActionResult, toActionError } from './_shared';

export async function getBusinessInsightsAction() {
  try {
    const auth = await requireStaffSession({ capability: 'reports.read' });
    return { ok: true as const, data: await getLatestSnapshot(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function refreshBusinessSnapshotAction(): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await saveDailySnapshot(auth.gymId);
    revalidatePath('/insights');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listDigestHistoryAction() {
  try {
    const auth = await requireStaffSession({ capability: 'reports.read' });
    return { ok: true as const, data: await listDigestHistory(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listAuditEventsAction() {
  try {
    const auth = await requireStaffSession({ capability: 'reports.read' });
    return { ok: true as const, data: await listAuditEvents(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


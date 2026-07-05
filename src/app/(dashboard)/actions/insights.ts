'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';





















import { getLatestSnapshot, saveDailySnapshot, listDigestHistory, markDigestActionDone, snoozeDigestAction, backfillSnapshots } from '@/services/business-assistant';
import { getAiConversationAnalytics } from '@/services/ai-front-desk';



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


export async function exportDigestPdfAction(): Promise<
  ActionResult<{ base64: string; filename: string }>
> {
  try {
    const auth = await requireStaffSession({ capability: 'reports.read' });
    const { getGymSettings } = await import('@/services/gym');
    const { buildDigestPdf } = await import('@/lib/digest-pdf');
    const gym = await getGymSettings(auth.gymId);
    const snapshot = await getLatestSnapshot(auth.gymId);
    const metrics = (snapshot.metrics ?? {}) as import('@/services/business-assistant').BusinessMetrics;
    const recommendations =
      (snapshot.recommendations ?? []) as import('@/services/business-assistant').BusinessRecommendation[];

    const pdf = await buildDigestPdf({
      gymName: gym.name,
      snapshotDate: snapshot.snapshot_date as string,
      metrics,
      recommendations,
    });

    return {
      ok: true,
      data: {
        base64: Buffer.from(pdf).toString('base64'),
        filename: `digest-${snapshot.snapshot_date}.pdf`,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}


export async function markDigestActionDoneAction(actionKey: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'reports.read' });
    await markDigestActionDone(auth.gymId, actionKey);
    revalidatePath('/insights');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function snoozeDigestActionAction(actionKey: string, days = 3): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'reports.read' });
    await snoozeDigestAction(auth.gymId, actionKey, days);
    revalidatePath('/insights');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function backfillDigestSnapshotsAction(days = 14): Promise<ActionResult<{ count: number }>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const count = await backfillSnapshots(auth.gymId, days);
    revalidatePath('/insights');
    return { ok: true, data: { count } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getAiAnalyticsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await getAiConversationAnalytics(auth.gymId) };
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


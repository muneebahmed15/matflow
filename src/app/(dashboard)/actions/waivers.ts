'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';


import { getMember } from '@/services/members';






import { createWaiver, bulkSendWaiverLinks, exportWaiverSignaturesCsv, getWaiver, getWaiverCompletionStats, getWaiverSignatures, listWaivers, signWaiver, toggleWaiverStatus, type Waiver } from '@/services/waivers';




import { sendMemberNotification } from '@/services/notifications';

import { checkRateLimit } from '@/lib/rate-limit';

























import { type ActionResult, toActionError } from './_shared';

export async function listWaiversAction(): Promise<ActionResult<Waiver[]>> {
  try {
    const auth = await requireStaffSession();
    const waivers = await listWaivers(auth.gymId);
    return { ok: true, data: waivers };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getWaiverAction(waiverId: string): Promise<ActionResult<Waiver>> {
  try {
    const auth = await requireStaffSession();
    const waiver = await getWaiver(auth.gymId, waiverId);
    return { ok: true, data: waiver };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getWaiverSignaturesAction(waiverId: string): Promise<ActionResult<unknown[]>> {
  try {
    const auth = await requireStaffSession();
    await getWaiver(auth.gymId, waiverId);
    const signatures = await getWaiverSignatures(waiverId);
    return { ok: true, data: signatures };
  } catch (error) {
    return toActionError(error);
  }
}


export async function signWaiverAction(input: {
  waiverId: string;
  memberId: string;
  signedName: string;
  guardianName?: string | null;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await getWaiver(auth.gymId, input.waiverId);
    await getMember(auth.gymId, input.memberId);
    await signWaiver({
      waiverId: input.waiverId,
      memberId: input.memberId,
      gymId: auth.gymId,
      signedName: input.signedName,
      guardianName: input.guardianName ?? null,
    });
    try {
      await sendMemberNotification({
        gymId: auth.gymId,
        memberId: input.memberId,
        type: 'waiver_signed',
      });
    } catch {
      // Best-effort notification.
    }
    revalidatePath('/waivers');
    revalidatePath(`/members/${input.memberId}`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getWaiverCompletionStatsAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof getWaiverCompletionStats>>>
> {
  try {
    const auth = await requireStaffSession({ capability: 'members.read' });
    const stats = await getWaiverCompletionStats(auth.gymId);
    return { ok: true, data: stats };
  } catch (error) {
    return toActionError(error);
  }
}


export async function bulkSendWaiverLinksAction(): Promise<
  ActionResult<{ sent: number; skipped: number }>
> {
  try {
    const auth = await requireStaffSession({ capability: 'members.write' });
    const limit = await checkRateLimit(`waiver-bulk:${auth.user.id}`, 3, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { ok: false, error: 'Bulk send rate limit reached. Try again later.' };
    }
    const result = await bulkSendWaiverLinks(auth.gymId);
    revalidatePath('/waivers');
    return { ok: true, data: result };
  } catch (error) {
    return toActionError(error);
  }
}


export async function exportWaiverSignaturesCsvAction(): Promise<ActionResult<string>> {
  try {
    const auth = await requireStaffSession({ capability: 'members.read' });
    const csv = await exportWaiverSignaturesCsv(auth.gymId);
    return { ok: true, data: csv };
  } catch (error) {
    return toActionError(error);
  }
}


export async function createWaiverAction(input: {
  title: string;
  body: string;
  expiresAfterDays?: number | null;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await createWaiver({
      ...input,
      gymId: auth.gymId,
      expiresAfterDays: input.expiresAfterDays,
    });
    revalidatePath('/waivers');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function updateWaiverAction(input: {
  waiverId: string;
  title: string;
  body: string;
  expiresAfterDays?: number | null;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'settings.write' });
    const { updateWaiver } = await import('@/services/waivers');
    await updateWaiver({ ...input, gymId: auth.gymId, actorId: auth.user.id });
    revalidatePath('/waivers');
    revalidatePath(`/waivers/${input.waiverId}`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function toggleWaiverStatusAction(
  waiverId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await toggleWaiverStatus(auth.gymId, waiverId, isActive);
    revalidatePath('/waivers');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


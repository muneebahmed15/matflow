'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';







import { promoteMember } from '@/services/belts';































import { type ActionResult, toActionError } from './_shared';

export async function promoteMemberAction(input: {
  memberId: string;
  fromBelt: string;
  toBelt: string;
  notes?: string;
  ceremonyDate?: string | null;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'belts.promote' });
    await promoteMember({
      ...input,
      gymId: auth.gymId,
      actorId: auth.user.id,
      allowDemotion: auth.role === 'admin',
    });
    revalidatePath('/belts');
    revalidatePath('/members');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function undoPromotionAction(promotionId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { undoPromotion } = await import('@/services/belts');
    await undoPromotion(auth.gymId, promotionId, auth.user.id);
    revalidatePath('/belts');
    revalidatePath('/members');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listBeltRequirementsAction(): Promise<
  ActionResult<import('@/services/belts').BeltRequirementRow[]>
> {
  try {
    const auth = await requireStaffSession();
    const { listBeltRequirements } = await import('@/services/belts');
    const rows = await listBeltRequirements(auth.gymId);
    return { ok: true, data: rows };
  } catch (error) {
    return toActionError(error);
  }
}


export async function saveBeltRequirementAction(input: {
  belt: string;
  minAttendance: number;
  minDaysAtRank: number;
  techniquesChecklist?: string | null;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'settings.write' });
    const { upsertBeltRequirement } = await import('@/services/belts');
    await upsertBeltRequirement({ ...input, gymId: auth.gymId });
    revalidatePath('/belts');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getPromotionReadinessAction(): Promise<
  ActionResult<import('@/services/belts').MemberReadiness[]>
> {
  try {
    const auth = await requireStaffSession({ capability: 'members.read' });
    const { getPromotionReadiness } = await import('@/services/belts');
    const rows = await getPromotionReadiness(auth.gymId);
    return { ok: true, data: rows };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getGymBeltSystemAction(): Promise<
  ActionResult<import('@/lib/belt-systems').BeltSystem>
> {
  try {
    const auth = await requireStaffSession();
    const { getGymBeltSystem } = await import('@/services/belts');
    const system = await getGymBeltSystem(auth.gymId);
    return { ok: true, data: system };
  } catch (error) {
    return toActionError(error);
  }
}

export async function exportMembersByBeltCsvAction(): Promise<ActionResult<string>> {
  try {
    const auth = await requireStaffSession({ capability: 'reports.read' });
    const { exportMembersByBeltCsv } = await import('@/services/belts');
    const csv = await exportMembersByBeltCsv(auth.gymId);
    return { ok: true, data: csv };
  } catch (error) {
    return toActionError(error);
  }
}


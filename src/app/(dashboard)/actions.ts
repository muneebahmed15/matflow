'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/staff';
import { isServiceError } from '@/services/errors';
import { createMember, type CreateMemberInput } from '@/services/members';
import { createLead, convertLeadToMember, updateLeadStatus } from '@/services/leads';
import { createClass, deleteClass } from '@/services/classes';
import { promoteMember } from '@/services/belts';
import { createWaiver, toggleWaiverStatus } from '@/services/waivers';
import { inviteStaffMember, removeStaffMember, updateStaffRole } from '@/services/staff';
import { checkRateLimit } from '@/lib/rate-limit';
import type { StaffRole } from '@/lib/auth/staff';

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function toActionError<T = void>(error: unknown): ActionResult<T> {
  if (isServiceError(error)) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: 'Something went wrong' };
}

export async function createMemberAction(
  input: Omit<CreateMemberInput, 'gymId'>
): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await requireStaffSession();
    const member = await createMember({ ...input, gymId: auth.gymId });
    revalidatePath('/members');
    return { ok: true, data: { id: member.id } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createLeadAction(input: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source?: string;
  interestedIn?: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await createLead({ ...input, gymId: auth.gymId });
    revalidatePath('/leads');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateLeadStatusAction(
  leadId: string,
  status: string
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await updateLeadStatus(auth.gymId, leadId, status);
    revalidatePath('/leads');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function convertLeadAction(leadId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await convertLeadToMember(auth.gymId, leadId);
    revalidatePath('/leads');
    revalidatePath('/members');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createClassAction(input: {
  name: string;
  instructor: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  capacity: number;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await createClass({ ...input, gymId: auth.gymId });
    revalidatePath('/classes');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteClassAction(classId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await deleteClass(auth.gymId, classId);
    revalidatePath('/classes');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function promoteMemberAction(input: {
  memberId: string;
  fromBelt: string;
  toBelt: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await promoteMember({ ...input, gymId: auth.gymId });
    revalidatePath('/belts');
    revalidatePath('/members');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createWaiverAction(input: {
  title: string;
  body: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await createWaiver({ ...input, gymId: auth.gymId });
    revalidatePath('/waivers');
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

export async function inviteStaffAction(input: {
  email: string;
  fullName: string;
  role: StaffRole;
}): Promise<ActionResult<{ staffRoleId: string }>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const limit = checkRateLimit(`staff-invite:${auth.user.id}`, 20, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { ok: false, error: 'Too many invites. Try again later.' };
    }

    const result = await inviteStaffMember({
      gymId: auth.gymId,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
    });
    revalidatePath('/staff');
    return { ok: true, data: { staffRoleId: result.staffRoleId } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeStaffAction(staffRoleId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await removeStaffMember(auth.gymId, staffRoleId, auth.user.id);
    revalidatePath('/staff');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateStaffRoleAction(
  staffRoleId: string,
  role: StaffRole
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await updateStaffRole(auth.gymId, staffRoleId, role);
    revalidatePath('/staff');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/staff';
import { isServiceError } from '@/services/errors';
import {
  createMember,
  deleteMember,
  getMember,
  listFamilies,
  listMembers,
  updateMember,
  type CreateMemberInput,
  type MemberDetail,
  type MemberSummary,
} from '@/services/members';
import { getGymSettings, updateGymSettings, type GymSettings } from '@/services/gym';
import { createLead, convertLeadToMember, updateLeadStatus } from '@/services/leads';
import { createClass, deleteClass } from '@/services/classes';
import { promoteMember } from '@/services/belts';
import {
  createWaiver,
  getMemberWaiverSignatures,
  getWaiver,
  getWaiverSignatures,
  listWaivers,
  signWaiver,
  toggleWaiverStatus,
  type Waiver,
} from '@/services/waivers';
import {
  inviteStaffMember,
  listStaffMembers,
  removeStaffMember,
  updateStaffRole,
} from '@/services/staff';
import { sendMemberNotification } from '@/services/notifications';
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

export async function listMembersAction(): Promise<ActionResult<MemberSummary[]>> {
  try {
    const auth = await requireStaffSession();
    const members = await listMembers(auth.gymId);
    return { ok: true, data: members };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listFamiliesAction(): Promise<
  ActionResult<{ id: string; family_name: string }[]>
> {
  try {
    const auth = await requireStaffSession();
    const families = await listFamilies(auth.gymId);
    return { ok: true, data: families };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getMemberAction(memberId: string): Promise<ActionResult<MemberDetail>> {
  try {
    const auth = await requireStaffSession();
    const member = await getMember(auth.gymId, memberId);
    return { ok: true, data: member };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateMemberAction(
  memberId: string,
  fields: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    belt_rank: string;
    status: string;
  }>
): Promise<ActionResult<MemberDetail>> {
  try {
    const auth = await requireStaffSession();
    const member = await updateMember(auth.gymId, memberId, fields);
    revalidatePath('/members');
    revalidatePath(`/members/${memberId}`);
    return { ok: true, data: member };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteMemberAction(memberId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await deleteMember(auth.gymId, memberId);
    revalidatePath('/members');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getGymSettingsAction(): Promise<ActionResult<GymSettings>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const settings = await getGymSettings(auth.gymId);
    return { ok: true, data: settings };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateGymSettingsAction(input: {
  name: string;
  slug: string;
  kioskEnabled: boolean;
}): Promise<ActionResult<GymSettings>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const settings = await updateGymSettings(auth.gymId, input);
    revalidatePath('/settings');
    return { ok: true, data: settings };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listStaffAction(): Promise<
  ActionResult<
    {
      id: string;
      user_id: string;
      role: string;
      full_name: string;
      created_at: string;
    }[]
  >
> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const staff = await listStaffMembers(auth.gymId);
    return { ok: true, data: staff };
  } catch (error) {
    return toActionError(error);
  }
}

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

export async function getMemberWaiverSignaturesAction(
  memberId: string
): Promise<ActionResult<unknown[]>> {
  try {
    const auth = await requireStaffSession();
    await getMember(auth.gymId, memberId);
    const signatures = await getMemberWaiverSignatures(memberId);
    return { ok: true, data: signatures };
  } catch (error) {
    return toActionError(error);
  }
}

export async function signWaiverAction(input: {
  waiverId: string;
  memberId: string;
  signedName: string;
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
    const limit = await checkRateLimit(`staff-invite:${auth.user.id}`, 20, 60 * 60 * 1000);
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

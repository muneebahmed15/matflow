'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';









import { inviteStaffMember, listStaffMembers, removeStaffMember, updateStaffRole } from '@/services/staff';




import { checkRateLimit } from '@/lib/rate-limit';

import type { StaffRole } from '@/lib/auth/staff';
























import { type ActionResult, toActionError } from './_shared';

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
    await updateStaffRole(auth.gymId, staffRoleId, role, auth.user.id);
    revalidatePath('/staff');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


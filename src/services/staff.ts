import { getAdminClient } from '@/lib/supabase/admin';
import { getPublicEnv } from '@/lib/env';
import {
  sendTransactionalEmail,
  staffAddedEmail,
  staffInviteEmail,
} from '@/lib/email/resend';
import { ServiceError } from '@/services/errors';
import { logAuditEvent } from '@/services/audit';
import type { StaffRole } from '@/lib/auth/staff';

type AdminClient = ReturnType<typeof getAdminClient>;

async function findUserIdByEmail(
  admin: AdminClient,
  email: string
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new ServiceError(500, error.message);

    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match.id;

    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}

async function assertNotDuplicateStaff(
  admin: AdminClient,
  gymId: string,
  userId: string
): Promise<void> {
  const { data } = await admin
    .from('staff_roles')
    .select('id')
    .eq('gym_id', gymId)
    .eq('user_id', userId)
    .maybeSingle();

  if (data) {
    throw new ServiceError(409, 'This person is already on your staff.');
  }
}

async function insertStaffRole(
  admin: AdminClient,
  input: {
    gymId: string;
    userId: string;
    role: StaffRole;
    fullName: string;
  }
) {
  const { data, error } = await admin
    .from('staff_roles')
    .insert({
      gym_id: input.gymId,
      user_id: input.userId,
      role: input.role,
      full_name: input.fullName.trim(),
    })
    .select('id')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data;
}

export type InviteStaffInput = {
  gymId: string;
  email: string;
  fullName: string;
  role: StaffRole;
};

export async function inviteStaffMember(
  input: InviteStaffInput
): Promise<{ staffRoleId: string; userId: string }> {
  const admin = getAdminClient();
  const { NEXT_PUBLIC_APP_URL } = getPublicEnv();
  const normalizedEmail = input.email.trim().toLowerCase();
  const loginUrl = `${NEXT_PUBLIC_APP_URL}/login`;

  if (!normalizedEmail || !input.fullName.trim()) {
    throw new ServiceError(400, 'Email and full name are required.');
  }

  const { data: gym } = await admin
    .from('gyms')
    .select('name')
    .eq('id', input.gymId)
    .maybeSingle();
  const gymName = gym?.name ?? 'your gym';

  const { data: inviteLink, error: inviteError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email: normalizedEmail,
    options: {
      redirectTo: loginUrl,
      data: { full_name: input.fullName.trim() },
    },
  });

  if (!inviteError && inviteLink.user?.id) {
    await assertNotDuplicateStaff(admin, input.gymId, inviteLink.user.id);
    const staffRole = await insertStaffRole(admin, {
      gymId: input.gymId,
      userId: inviteLink.user.id,
      role: input.role,
      fullName: input.fullName,
    });

    const actionLink = inviteLink.properties?.action_link;
    if (actionLink) {
      const template = staffInviteEmail({
        fullName: input.fullName.trim(),
        gymName,
        role: input.role,
        actionLink,
      });
      await sendTransactionalEmail({ ...template, to: normalizedEmail });
    }

    return { staffRoleId: staffRole.id, userId: inviteLink.user.id };
  }

  const existingUserId = await findUserIdByEmail(admin, normalizedEmail);
  if (!existingUserId) {
    throw new ServiceError(400, inviteError?.message ?? 'Unable to invite staff member.');
  }

  await assertNotDuplicateStaff(admin, input.gymId, existingUserId);
  const staffRole = await insertStaffRole(admin, {
    gymId: input.gymId,
    userId: existingUserId,
    role: input.role,
    fullName: input.fullName,
  });

  const { data: magicLink, error: magicError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
    options: { redirectTo: loginUrl },
  });

  if (magicError) {
    throw new ServiceError(500, magicError.message);
  }

  const actionLink = magicLink.properties?.action_link ?? loginUrl;
  const template = staffAddedEmail({
    fullName: input.fullName.trim(),
    gymName,
    role: input.role,
    loginLink: actionLink,
  });
  await sendTransactionalEmail({ ...template, to: normalizedEmail });

  return { staffRoleId: staffRole.id, userId: existingUserId };
}

export async function removeStaffMember(
  gymId: string,
  staffRoleId: string,
  actorUserId: string
): Promise<void> {
  const admin = getAdminClient();

  const { data: staffRole, error } = await admin
    .from('staff_roles')
    .select('id, user_id, gym_id')
    .eq('id', staffRoleId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (error) throw new ServiceError(500, error.message);
  if (!staffRole) throw new ServiceError(404, 'Staff member not found.');

  const { data: gym } = await admin
    .from('gyms')
    .select('owner_id')
    .eq('id', gymId)
    .maybeSingle();

  if (gym?.owner_id === staffRole.user_id) {
    throw new ServiceError(400, 'Cannot remove the gym owner.');
  }

  if (staffRole.user_id === actorUserId) {
    throw new ServiceError(400, 'You cannot remove your own staff access.');
  }

  const { error: deleteError } = await admin
    .from('staff_roles')
    .delete()
    .eq('id', staffRoleId)
    .eq('gym_id', gymId);

  if (deleteError) throw new ServiceError(500, deleteError.message);

  await logAuditEvent({
    gymId,
    actorId: actorUserId,
    action: 'staff.removed',
    entityType: 'staff_roles',
    entityId: staffRoleId,
  });
}

export async function updateStaffRole(
  gymId: string,
  staffRoleId: string,
  role: StaffRole,
  actorUserId: string
): Promise<void> {
  const admin = getAdminClient();

  const { data: existing } = await admin
    .from('staff_roles')
    .select('role')
    .eq('id', staffRoleId)
    .eq('gym_id', gymId)
    .maybeSingle();

  const { error } = await admin
    .from('staff_roles')
    .update({ role })
    .eq('id', staffRoleId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);

  if (existing && existing.role !== role) {
    await logAuditEvent({
      gymId,
      actorId: actorUserId,
      action: 'staff.role_changed',
      entityType: 'staff_roles',
      entityId: staffRoleId,
      payload: { from: existing.role, to: role },
    });
  }
}

export async function listStaffMembers(gymId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('staff_roles')
    .select('id, user_id, role, full_name, created_at')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: true });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

import { getAdminClient } from '@/lib/supabase/admin';
import type { StaffAuth } from '@/lib/auth/staff';
import { ServiceError } from '@/services/errors';
import { hasCapability } from '@/lib/permissions/capabilities';

/** Returns class IDs assigned to an instructor, or null when the role may see all classes. */
export async function getInstructorScopedClassIds(
  auth: StaffAuth
): Promise<string[] | null> {
  if (auth.role !== 'coach') return null;

  const admin = getAdminClient();
  const { data: staffRow } = await admin
    .from('staff_roles')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('gym_id', auth.gymId)
    .maybeSingle();

  if (!staffRow) return [];

  const [{ data: classes }, { data: overrides }] = await Promise.all([
    admin
      .from('classes')
      .select('id')
      .eq('gym_id', auth.gymId)
      .eq('instructor_staff_id', staffRow.id),
    admin
      .from('class_staff_permissions')
      .select('class_id')
      .eq('gym_id', auth.gymId)
      .eq('staff_id', staffRow.id),
  ]);

  const classIds = new Set<string>();
  for (const row of classes ?? []) classIds.add(row.id);
  for (const row of overrides ?? []) classIds.add(row.class_id);

  return [...classIds];
}

export function classIdAllowed(
  scopedClassIds: string[] | null,
  classId: string
): boolean {
  if (scopedClassIds === null) return true;
  return scopedClassIds.includes(classId);
}

export async function assertStaffClassAccess(auth: StaffAuth, classId: string): Promise<void> {
  if (hasCapability(auth.role, 'classes.manage')) return;

  const scoped = await getInstructorScopedClassIds(auth);
  if (!classIdAllowed(scoped, classId)) {
    throw new ServiceError(403, 'You do not have access to manage this class.');
  }
}

export async function assertStaffSessionAccess(auth: StaffAuth, sessionId: string): Promise<void> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('class_sessions')
    .select('class_id')
    .eq('id', sessionId)
    .eq('gym_id', auth.gymId)
    .maybeSingle();

  if (error) throw new ServiceError(500, error.message);
  if (!data) throw new ServiceError(404, 'Session not found');

  await assertStaffClassAccess(auth, data.class_id);
}

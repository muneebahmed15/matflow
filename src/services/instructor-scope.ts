import { getAdminClient } from '@/lib/supabase/admin';
import type { StaffAuth } from '@/lib/auth/staff';

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

  const { data: classes } = await admin
    .from('classes')
    .select('id')
    .eq('gym_id', auth.gymId)
    .eq('instructor_staff_id', staffRow.id);

  return (classes ?? []).map((c) => c.id);
}

export function classIdAllowed(
  scopedClassIds: string[] | null,
  classId: string
): boolean {
  if (scopedClassIds === null) return true;
  return scopedClassIds.includes(classId);
}

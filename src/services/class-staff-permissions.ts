import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type ClassStaffPermission = {
  id: string;
  gym_id: string;
  class_id: string;
  staff_id: string;
  created_at: string;
  staff_roles?: { full_name: string; role: string } | null;
};

export async function listClassStaffPermissions(
  gymId: string,
  classId: string
): Promise<ClassStaffPermission[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('class_staff_permissions')
    .select('*, staff_roles(full_name, role)')
    .eq('gym_id', gymId)
    .eq('class_id', classId)
    .order('created_at');

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as ClassStaffPermission[];
}

export async function grantClassStaffPermission(
  gymId: string,
  classId: string,
  staffId: string
): Promise<ClassStaffPermission> {
  const admin = getAdminClient();

  const { data: gymClass } = await admin
    .from('classes')
    .select('id, instructor_staff_id')
    .eq('id', classId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!gymClass) throw new ServiceError(404, 'Class not found.');
  if (gymClass.instructor_staff_id === staffId) {
    throw new ServiceError(400, 'This staff member is already the assigned instructor.');
  }

  const { data: staff } = await admin
    .from('staff_roles')
    .select('id')
    .eq('id', staffId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!staff) throw new ServiceError(404, 'Staff member not found.');

  const { data, error } = await admin
    .from('class_staff_permissions')
    .insert({ gym_id: gymId, class_id: classId, staff_id: staffId })
    .select('*, staff_roles(full_name, role)')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new ServiceError(409, 'This staff member already has access to the class.');
    }
    throw new ServiceError(500, error.message);
  }

  return data as ClassStaffPermission;
}

export async function revokeClassStaffPermission(
  gymId: string,
  classId: string,
  staffId: string
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('class_staff_permissions')
    .delete()
    .eq('gym_id', gymId)
    .eq('class_id', classId)
    .eq('staff_id', staffId);

  if (error) throw new ServiceError(500, error.message);
}

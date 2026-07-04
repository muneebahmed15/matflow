import { getAdminClient } from '@/lib/supabase/admin';
import { effectiveEnrollmentLimit } from '@/lib/class-capacity';
import { ServiceError } from '@/services/errors';
import { promoteNextFromWaitlist } from '@/services/class-waitlist';

export type ClassEnrollment = {
  id: string;
  gym_id: string;
  class_id: string;
  member_id: string;
  status: string;
  enrolled_at: string;
  classes?: {
    name: string;
    day_of_week: string | null;
    start_time: string | null;
    end_time: string | null;
  } | null;
};

export function assertClassHasCapacity(
  capacity: number | null,
  activeCount: number,
  overbookAllowance = 0
): void {
  const limit = effectiveEnrollmentLimit(capacity, overbookAllowance);
  if (limit !== null && activeCount >= limit) {
    throw new ServiceError(
      409,
      'This class is full. Join the waitlist to be notified when a spot opens.'
    );
  }
}

export { effectiveEnrollmentLimit } from '@/lib/class-capacity';

export async function countActiveEnrollments(classId: string): Promise<number> {
  const admin = getAdminClient();
  const { count, error } = await admin
    .from('class_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId)
    .eq('status', 'active');

  if (error) throw new ServiceError(500, error.message);
  return count ?? 0;
}

export async function enrollMemberInClass(input: {
  gymId: string;
  classId: string;
  memberId: string;
}): Promise<ClassEnrollment> {
  const admin = getAdminClient();

  const { data: gymClass } = await admin
    .from('classes')
    .select('id, capacity, overbook_allowance')
    .eq('id', input.classId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (!gymClass) throw new ServiceError(404, 'Class not found.');

  const { data: member } = await admin
    .from('members')
    .select('id, status')
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (!member) throw new ServiceError(404, 'Member not found.');
  if (member.status !== 'active') {
    throw new ServiceError(403, 'Only active members can book classes.');
  }

  const { data: existing } = await admin
    .from('class_enrollments')
    .select('id, status')
    .eq('class_id', input.classId)
    .eq('member_id', input.memberId)
    .maybeSingle();

  if (existing?.status === 'active') {
    throw new ServiceError(409, 'Already booked in this class.');
  }

  const activeCount = await countActiveEnrollments(input.classId);
  assertClassHasCapacity(
    gymClass.capacity ?? null,
    activeCount,
    gymClass.overbook_allowance ?? 0
  );

  const { data, error } = await admin
    .from('class_enrollments')
    .upsert(
      {
        gym_id: input.gymId,
        class_id: input.classId,
        member_id: input.memberId,
        status: 'active',
        enrolled_at: new Date().toISOString(),
        cancelled_at: null,
      },
      { onConflict: 'class_id,member_id' }
    )
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as ClassEnrollment;
}

export async function cancelEnrollment(input: {
  gymId: string;
  classId: string;
  memberId: string;
}): Promise<void> {
  const admin = getAdminClient();

  const { error } = await admin
    .from('class_enrollments')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('gym_id', input.gymId)
    .eq('class_id', input.classId)
    .eq('member_id', input.memberId)
    .eq('status', 'active');

  if (error) throw new ServiceError(500, error.message);

  // A spot opened; notify next member on the waitlist (best-effort).
  await promoteNextFromWaitlist(input.gymId, input.classId).catch(() => null);
}

export async function listMemberEnrollments(
  gymId: string,
  memberId: string
): Promise<ClassEnrollment[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('class_enrollments')
    .select('*, classes(name, day_of_week, start_time, end_time)')
    .eq('gym_id', gymId)
    .eq('member_id', memberId)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as ClassEnrollment[];
}

/** Active enrollment counts per class for a gym, keyed by class_id. */
export async function getEnrollmentCounts(gymId: string): Promise<Record<string, number>> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('class_enrollments')
    .select('class_id')
    .eq('gym_id', gymId)
    .eq('status', 'active');

  if (error) throw new ServiceError(500, error.message);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.class_id] = (counts[row.class_id] ?? 0) + 1;
  }
  return counts;
}

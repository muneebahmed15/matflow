import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type ClassScheduleException = {
  id: string;
  gym_id: string;
  class_id: string;
  exception_date: string;
  reason: string | null;
  created_at: string;
};

export async function listClassScheduleExceptions(
  gymId: string,
  options?: { fromDate?: string; classId?: string }
): Promise<ClassScheduleException[]> {
  const admin = getAdminClient();
  let query = admin
    .from('class_schedule_exceptions')
    .select('*')
    .eq('gym_id', gymId)
    .order('exception_date');

  if (options?.fromDate) query = query.gte('exception_date', options.fromDate);
  if (options?.classId) query = query.eq('class_id', options.classId);

  const { data, error } = await query;
  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as ClassScheduleException[];
}

export async function isClassCancelledOnDate(
  gymId: string,
  classId: string,
  exceptionDate: string
): Promise<boolean> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('class_schedule_exceptions')
    .select('id')
    .eq('gym_id', gymId)
    .eq('class_id', classId)
    .eq('exception_date', exceptionDate)
    .maybeSingle();
  return Boolean(data);
}

export async function cancelClassOnDate(input: {
  gymId: string;
  classId: string;
  exceptionDate: string;
  reason?: string;
}): Promise<ClassScheduleException> {
  const admin = getAdminClient();

  const { data: gymClass } = await admin
    .from('classes')
    .select('id')
    .eq('id', input.classId)
    .eq('gym_id', input.gymId)
    .maybeSingle();
  if (!gymClass) throw new ServiceError(404, 'Class not found');

  const { data, error } = await admin
    .from('class_schedule_exceptions')
    .upsert(
      {
        gym_id: input.gymId,
        class_id: input.classId,
        exception_date: input.exceptionDate,
        reason: input.reason?.trim() || null,
      },
      { onConflict: 'class_id,exception_date' }
    )
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as ClassScheduleException;
}

export async function restoreClassOnDate(
  gymId: string,
  classId: string,
  exceptionDate: string
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('class_schedule_exceptions')
    .delete()
    .eq('gym_id', gymId)
    .eq('class_id', classId)
    .eq('exception_date', exceptionDate);

  if (error) throw new ServiceError(500, error.message);
}

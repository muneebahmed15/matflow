import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { effectiveSessionInstructor } from '@/lib/class-sessions-display';
import { isClassCancelledOnDate } from '@/services/class-schedule-exceptions';

export type ClassSession = {
  id: string;
  gym_id: string;
  class_id: string;
  session_date: string;
  instructor: string | null;
  substitute_instructor: string | null;
  substitute_staff_id: string | null;
  created_at: string;
};

export { effectiveSessionInstructor } from '@/lib/class-sessions-display';

export async function getOrCreateTodaySession(
  gymId: string,
  classId: string,
  instructor?: string
): Promise<ClassSession> {
  const admin = getAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await admin
    .from('class_sessions')
    .select('*')
    .eq('class_id', classId)
    .eq('gym_id', gymId)
    .eq('session_date', today)
    .maybeSingle();

  if (existing) return existing as ClassSession;

  const cancelled = await isClassCancelledOnDate(gymId, classId, today);
  if (cancelled) {
    throw new ServiceError(409, 'This class is cancelled for today.');
  }

  const { data, error } = await admin
    .from('class_sessions')
    .insert({
      gym_id: gymId,
      class_id: classId,
      session_date: today,
      instructor: instructor?.trim() || null,
    })
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as ClassSession;
}

export async function listSessionAttendance(sessionId: string, gymId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('class_session_attendance')
    .select('*, members(first_name, last_name)')
    .eq('session_id', sessionId)
    .eq('gym_id', gymId)
    .order('checked_in_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export async function markSessionAttendance(input: {
  gymId: string;
  sessionId: string;
  memberId: string;
}): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from('class_session_attendance').upsert(
    {
      session_id: input.sessionId,
      member_id: input.memberId,
      gym_id: input.gymId,
      checked_in_at: new Date().toISOString(),
    },
    { onConflict: 'session_id,member_id' }
  );

  if (error) throw new ServiceError(500, error.message);
}

export async function removeSessionAttendance(
  gymId: string,
  sessionId: string,
  memberId: string,
  options?: { staffRole?: 'admin' | 'supervisor' | 'coach' }
): Promise<void> {
  const admin = getAdminClient();

  const { data: session } = await admin
    .from('class_sessions')
    .select('session_date')
    .eq('id', sessionId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!session) throw new ServiceError(404, 'Session not found');

  const today = new Date().toISOString().slice(0, 10);
  if (session.session_date < today) {
    const role = options?.staffRole;
    if (role !== 'admin' && role !== 'supervisor') {
      throw new ServiceError(
        403,
        'Past session attendance can only be removed by an admin or supervisor.'
      );
    }
  }

  const { error } = await admin
    .from('class_session_attendance')
    .delete()
    .eq('session_id', sessionId)
    .eq('member_id', memberId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

export async function updateSessionSubstitute(
  gymId: string,
  sessionId: string,
  input: { substituteInstructor?: string | null; substituteStaffId?: string | null }
): Promise<ClassSession> {
  const admin = getAdminClient();
  const updates: Record<string, unknown> = {};
  if (input.substituteInstructor !== undefined) {
    updates.substitute_instructor = input.substituteInstructor?.trim() || null;
  }
  if (input.substituteStaffId !== undefined) {
    updates.substitute_staff_id = input.substituteStaffId;
  }

  const { data, error } = await admin
    .from('class_sessions')
    .update(updates)
    .eq('id', sessionId)
    .eq('gym_id', gymId)
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as ClassSession;
}

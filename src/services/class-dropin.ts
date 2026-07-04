import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { countActiveEnrollments, assertClassHasCapacity } from '@/services/class-enrollment';

export type DropInBooking = {
  id: string;
  gym_id: string;
  session_id: string;
  member_id: string;
  status: string;
  created_at: string;
  class_sessions?: {
    session_date: string;
    class_id: string;
    classes?: { name: string; start_time: string | null; day_of_week: string | null } | null;
  } | null;
};

async function getOrCreateSessionForDate(
  gymId: string,
  classId: string,
  sessionDate: string
): Promise<{ id: string }> {
  const admin = getAdminClient();

  const { data: existing } = await admin
    .from('class_sessions')
    .select('id')
    .eq('class_id', classId)
    .eq('gym_id', gymId)
    .eq('session_date', sessionDate)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await admin
    .from('class_sessions')
    .insert({ gym_id: gymId, class_id: classId, session_date: sessionDate })
    .select('id')
    .single();

  if (error || !data) throw new ServiceError(500, error?.message ?? 'Session create failed');
  return data;
}

async function countSessionBookings(sessionId: string): Promise<number> {
  const admin = getAdminClient();
  const { count, error } = await admin
    .from('class_session_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('status', 'booked');

  if (error) throw new ServiceError(500, error.message);
  return count ?? 0;
}

export async function bookDropIn(input: {
  gymId: string;
  classId: string;
  memberId: string;
  sessionDate: string; // YYYY-MM-DD
}): Promise<DropInBooking> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.sessionDate)) {
    throw new ServiceError(400, 'Invalid session date.');
  }
  if (input.sessionDate < new Date().toISOString().slice(0, 10)) {
    throw new ServiceError(400, 'Cannot book a past session.');
  }

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

  const session = await getOrCreateSessionForDate(input.gymId, input.classId, input.sessionDate);

  const { data: existing } = await admin
    .from('class_session_bookings')
    .select('id, status')
    .eq('session_id', session.id)
    .eq('member_id', input.memberId)
    .maybeSingle();

  if (existing?.status === 'booked') {
    throw new ServiceError(409, 'Already booked for this session.');
  }

  // Session seats = class capacity minus recurring enrollees and other drop-ins.
  const [enrolled, dropIns] = await Promise.all([
    countActiveEnrollments(input.classId),
    countSessionBookings(session.id),
  ]);
  assertClassHasCapacity(
    gymClass.capacity ?? null,
    enrolled + dropIns,
    gymClass.overbook_allowance ?? 0
  );

  const { data, error } = await admin
    .from('class_session_bookings')
    .upsert(
      {
        gym_id: input.gymId,
        session_id: session.id,
        member_id: input.memberId,
        status: 'booked',
        created_at: new Date().toISOString(),
        cancelled_at: null,
      },
      { onConflict: 'session_id,member_id' }
    )
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as DropInBooking;
}

export async function cancelDropIn(input: {
  gymId: string;
  sessionId: string;
  memberId: string;
}): Promise<void> {
  const admin = getAdminClient();

  const { data: session } = await admin
    .from('class_sessions')
    .select('id, session_date, classes(start_time)')
    .eq('id', input.sessionId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (!session) throw new ServiceError(404, 'Session not found.');

  const { data: gym } = await admin
    .from('gyms')
    .select('booking_cancel_hours')
    .eq('id', input.gymId)
    .maybeSingle();

  const cancelHours =
    (gym as { booking_cancel_hours?: number } | null)?.booking_cancel_hours ?? 2;

  const startTime =
    (session as { classes?: { start_time?: string | null } | null }).classes?.start_time ??
    '00:00';
  const sessionStart = new Date(`${session.session_date}T${startTime}`);

  if (!Number.isNaN(sessionStart.getTime())) {
    const deadline = new Date(sessionStart.getTime() - cancelHours * 3_600_000);
    if (new Date() > deadline && new Date() < sessionStart) {
      throw new ServiceError(
        403,
        `Bookings must be cancelled at least ${cancelHours} hour${cancelHours === 1 ? '' : 's'} before class starts.`
      );
    }
  }

  const { error } = await admin
    .from('class_session_bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('gym_id', input.gymId)
    .eq('session_id', input.sessionId)
    .eq('member_id', input.memberId)
    .eq('status', 'booked');

  if (error) throw new ServiceError(500, error.message);
}

export async function listMemberDropIns(
  gymId: string,
  memberId: string
): Promise<DropInBooking[]> {
  const admin = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await admin
    .from('class_session_bookings')
    .select('*, class_sessions!inner(session_date, class_id, classes(name, start_time, day_of_week))')
    .eq('gym_id', gymId)
    .eq('member_id', memberId)
    .eq('status', 'booked')
    .gte('class_sessions.session_date', today);

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as DropInBooking[];
}

export type ClassAttendanceReport = {
  classId: string;
  sessions: number;
  totalAttendance: number;
  avgPerSession: number;
};

/** Attendance report per class over the trailing N days. */
export async function getClassAttendanceReport(
  gymId: string,
  days = 30
): Promise<ClassAttendanceReport[]> {
  const admin = getAdminClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  const { data: sessions, error } = await admin
    .from('class_sessions')
    .select('id, class_id, session_date')
    .eq('gym_id', gymId)
    .gte('session_date', since);

  if (error) throw new ServiceError(500, error.message);
  if (!sessions?.length) return [];

  const sessionIds = sessions.map((s) => s.id);
  const { data: attendance, error: aErr } = await admin
    .from('class_session_attendance')
    .select('session_id')
    .eq('gym_id', gymId)
    .in('session_id', sessionIds);

  if (aErr) throw new ServiceError(500, aErr.message);

  const attendanceBySession = new Map<string, number>();
  for (const row of attendance ?? []) {
    attendanceBySession.set(row.session_id, (attendanceBySession.get(row.session_id) ?? 0) + 1);
  }

  const byClass = new Map<string, { sessions: number; total: number }>();
  for (const s of sessions) {
    const entry = byClass.get(s.class_id) ?? { sessions: 0, total: 0 };
    entry.sessions += 1;
    entry.total += attendanceBySession.get(s.id) ?? 0;
    byClass.set(s.class_id, entry);
  }

  return [...byClass.entries()].map(([classId, stats]) => ({
    classId,
    sessions: stats.sessions,
    totalAttendance: stats.total,
    avgPerSession: stats.sessions > 0 ? Math.round((stats.total / stats.sessions) * 10) / 10 : 0,
  }));
}

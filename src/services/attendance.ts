import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';

type AttendanceRow = Database['public']['Tables']['attendance']['Row'];
type MemberRow = Database['public']['Tables']['members']['Row'];

export type AttendanceWithMember = AttendanceRow & {
  members: Pick<MemberRow, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'> | null;
};

export type AttendanceLogRecord = Pick<AttendanceRow, 'id' | 'checked_in_at'> & {
  members: Pick<MemberRow, 'first_name' | 'last_name' | 'email'>;
};

function todayBounds(date?: string): { start: string; end: string; day: string } {
  const day = date ?? new Date().toISOString().split('T')[0];
  return {
    day,
    start: `${day}T00:00:00`,
    end: `${day}T23:59:59`,
  };
}

export async function listAttendance(
  gymId: string,
  options?: { date?: string; locationId?: string | null }
): Promise<AttendanceWithMember[]> {
  const admin = getAdminClient();
  const { start, end } = todayBounds(options?.date);

  let query = admin
    .from('attendance')
    .select('*, members(id, first_name, last_name, email, phone)')
    .eq('gym_id', gymId)
    .order('checked_in_at', { ascending: false });

  if (options?.date) {
    query = query.gte('checked_in_at', start).lte('checked_in_at', end);
  }

  if (options?.locationId) {
    query = query.eq('location_id', options.locationId);
  }

  const { data, error } = await query;
  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as AttendanceWithMember[];
}

export async function getTodayCheckedInMemberIds(gymId: string): Promise<string[]> {
  const admin = getAdminClient();
  const { start, end } = todayBounds();

  const { data, error } = await admin
    .from('attendance')
    .select('member_id')
    .eq('gym_id', gymId)
    .gte('checked_in_at', start)
    .lte('checked_in_at', end);

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []).map((row) => row.member_id);
}

export async function checkInMember(input: {
  gymId: string;
  memberId: string;
  checkedInBy?: string | null;
  notes?: string | null;
  classId?: string | null;
  locationId?: string | null;
}): Promise<AttendanceRow> {
  const admin = getAdminClient();
  const { start, end } = todayBounds();

  const { data: member } = await admin
    .from('members')
    .select('id, date_of_birth')
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (!member) {
    throw new ServiceError(404, 'Member not found');
  }

  const { assertMinorHasEmergencyContact } = await import('@/services/emergency-contacts');
  await assertMinorHasEmergencyContact(input.gymId, input.memberId, member.date_of_birth);

  const { assertMemberWaiverCompliance } = await import('@/services/waivers');
  await assertMemberWaiverCompliance(input.gymId, input.memberId);

  let classId: string | null = null;
  let locationId: string | null = input.locationId ?? null;

  if (locationId) {
    const { data: location } = await admin
      .from('gym_locations')
      .select('id')
      .eq('id', locationId)
      .eq('gym_id', input.gymId)
      .maybeSingle();
    if (!location) throw new ServiceError(400, 'Invalid location for check-in.');
  }

  if (input.classId) {
    const { weekdayNameForDate } = await import('@/lib/todays-classes');
    const today = new Date().toISOString().slice(0, 10);
    const { data: gymClass } = await admin
      .from('classes')
      .select('id, day_of_week, instructor, is_active, location_id')
      .eq('id', input.classId)
      .eq('gym_id', input.gymId)
      .maybeSingle();

    if (!gymClass?.is_active) {
      throw new ServiceError(400, 'Invalid class for check-in.');
    }
    if (gymClass.day_of_week !== weekdayNameForDate()) {
      throw new ServiceError(400, 'That class is not scheduled today.');
    }

    const { isClassCancelledOnDate } = await import('@/services/class-schedule-exceptions');
    if (await isClassCancelledOnDate(input.gymId, input.classId, today)) {
      throw new ServiceError(409, 'That class is cancelled today.');
    }

    classId = gymClass.id;
    if (gymClass.location_id) locationId = gymClass.location_id;
  }

  const { data: existing } = await admin
    .from('attendance')
    .select('id')
    .eq('gym_id', input.gymId)
    .eq('member_id', input.memberId)
    .gte('checked_in_at', start)
    .lte('checked_in_at', end)
    .maybeSingle();

  if (existing) {
    throw new ServiceError(409, 'Member already checked in today');
  }

  const { data, error } = await admin
    .from('attendance')
    .insert({
      member_id: input.memberId,
      gym_id: input.gymId,
      notes: input.notes ?? null,
      checked_in_by: input.checkedInBy ?? null,
      class_id: classId,
      location_id: locationId,
    })
    .select()
    .single();

  if (error) throw new ServiceError(500, error.message);

  if (classId) {
    const { getOrCreateTodaySession, markSessionAttendance } = await import(
      '@/services/class-sessions'
    );
    const { data: cls } = await admin
      .from('classes')
      .select('instructor')
      .eq('id', classId)
      .maybeSingle();
    const session = await getOrCreateTodaySession(
      input.gymId,
      classId,
      cls?.instructor ?? undefined
    );
    await markSessionAttendance({
      gymId: input.gymId,
      sessionId: session.id,
      memberId: input.memberId,
    });
  }

  const { maybeRequestReviewAfterCheckIn } = await import('@/services/review-automation');
  void maybeRequestReviewAfterCheckIn(input.gymId, input.memberId).catch(() => undefined);

  return data;
}

export async function validateKioskCheckIn(gymId: string, memberId: string): Promise<void> {
  const admin = getAdminClient();

  const { data: gym } = await admin
    .from('gyms')
    .select('id, kiosk_enabled')
    .eq('id', gymId)
    .maybeSingle();

  if (!gym?.kiosk_enabled) {
    throw new ServiceError(403, 'Kiosk check-in disabled');
  }

  const { data: member } = await admin
    .from('members')
    .select('id, status')
    .eq('id', memberId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!member) {
    throw new ServiceError(404, 'Member not found');
  }

  if (member.status === 'past_due') {
    throw new ServiceError(403, 'Membership payment is past due. See the front desk to update billing.');
  }

  if (member.status !== 'active') {
    throw new ServiceError(403, 'Membership is not active');
  }

  const { assertMemberWaiverCompliance } = await import('@/services/waivers');
  await assertMemberWaiverCompliance(gymId, memberId);
}

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
  options?: { date?: string }
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
}): Promise<AttendanceRow> {
  const admin = getAdminClient();
  const { start, end } = todayBounds();

  const { data: member } = await admin
    .from('members')
    .select('id')
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (!member) {
    throw new ServiceError(404, 'Member not found');
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
    })
    .select()
    .single();

  if (error) throw new ServiceError(500, error.message);
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
    .select('id')
    .eq('id', memberId)
    .eq('gym_id', gymId)
    .eq('status', 'active')
    .maybeSingle();

  if (!member) {
    throw new ServiceError(404, 'Member not found');
  }
}

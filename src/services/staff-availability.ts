import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';

type StaffAvailabilityRow = Database['public']['Tables']['staff_availability']['Row'];

export type StaffAvailabilitySlot = Pick<
  StaffAvailabilityRow,
  'id' | 'staff_id' | 'day_of_week' | 'start_time' | 'end_time'
>;

export async function listStaffAvailability(
  gymId: string,
  staffId?: string
): Promise<StaffAvailabilitySlot[]> {
  const admin = getAdminClient();
  let query = admin
    .from('staff_availability')
    .select('id, staff_id, day_of_week, start_time, end_time')
    .eq('gym_id', gymId)
    .order('staff_id')
    .order('day_of_week')
    .order('start_time');

  if (staffId) query = query.eq('staff_id', staffId);

  const { data, error } = await query;
  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as StaffAvailabilitySlot[];
}

export async function upsertStaffAvailability(input: {
  gymId: string;
  staffId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): Promise<StaffAvailabilitySlot> {
  if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    throw new ServiceError(400, 'day_of_week must be 0–6 (Sun–Sat).');
  }
  if (input.startTime >= input.endTime) {
    throw new ServiceError(400, 'start_time must be before end_time.');
  }

  const admin = getAdminClient();
  const { data: staff } = await admin
    .from('staff_roles')
    .select('id')
    .eq('id', input.staffId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (!staff) throw new ServiceError(404, 'Staff member not found.');

  const { data, error } = await admin
    .from('staff_availability')
    .insert({
      gym_id: input.gymId,
      staff_id: input.staffId,
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
    })
    .select('id, staff_id, day_of_week, start_time, end_time')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as StaffAvailabilitySlot;
}

export async function deleteStaffAvailability(
  gymId: string,
  slotId: string
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('staff_availability')
    .delete()
    .eq('id', slotId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

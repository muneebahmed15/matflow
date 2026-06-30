import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';

type ClassRow = Database['public']['Tables']['classes']['Row'];

export async function listClasses(gymId: string): Promise<ClassRow[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('classes')
    .select('*')
    .eq('gym_id', gymId)
    .order('day_of_week')
    .order('start_time');

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export type CreateClassInput = {
  gymId: string;
  name: string;
  instructor: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  capacity: number;
};

export async function createClass(input: CreateClassInput): Promise<ClassRow> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('classes')
    .insert({
      gym_id: input.gymId,
      name: input.name.trim(),
      instructor: input.instructor.trim(),
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      capacity: input.capacity,
    })
    .select()
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data;
}

export async function deleteClass(gymId: string, classId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('classes')
    .delete()
    .eq('id', classId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

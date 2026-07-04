import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';
import { buildWeeklyRecurrenceRule, sortDays } from '@/lib/class-recurrence';
import { randomUUID } from 'crypto';

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

export async function listClassesForStaff(
  gymId: string,
  scopedClassIds: string[] | null
): Promise<ClassRow[]> {
  const classes = await listClasses(gymId);
  if (scopedClassIds === null) return classes;
  return classes.filter((c) => scopedClassIds.includes(c.id));
}

export type CreateClassInput = {
  gymId: string;
  name: string;
  description?: string | null;
  instructor: string;
  instructorStaffId?: string | null;
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
      description: input.description?.trim() || null,
      instructor: input.instructor.trim(),
      instructor_staff_id: input.instructorStaffId ?? null,
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

export type CreateClassSeriesInput = Omit<CreateClassInput, 'dayOfWeek'> & { daysOfWeek: string[] };

export async function createClassSeries(
  input: CreateClassSeriesInput
): Promise<ClassRow[]> {
  const days = sortDays(input.daysOfWeek);
  if (days.length < 2) {
    throw new ServiceError(400, 'Select at least two days for a recurring series.');
  }

  const admin = getAdminClient();
  const seriesId = randomUUID();
  const recurrenceRule = buildWeeklyRecurrenceRule(days);
  const rows = days.map((dayOfWeek) => ({
    gym_id: input.gymId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    instructor: input.instructor.trim(),
    instructor_staff_id: input.instructorStaffId ?? null,
    day_of_week: dayOfWeek,
    start_time: input.startTime,
    end_time: input.endTime,
    capacity: input.capacity,
    series_id: seriesId,
    recurrence_rule: recurrenceRule,
  }));

  const { data, error } = await admin.from('classes').insert(rows).select('*');
  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as ClassRow[];
}

export async function deleteClassSeries(gymId: string, seriesId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from('classes').delete().eq('gym_id', gymId).eq('series_id', seriesId);
  if (error) throw new ServiceError(500, error.message);
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

export async function updateClass(
  gymId: string,
  classId: string,
  input: Partial<CreateClassInput>
): Promise<ClassRow> {
  const admin = getAdminClient();
  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.description !== undefined) updates.description = input.description?.trim() || null;
  if (input.instructor !== undefined) updates.instructor = input.instructor.trim();
  if (input.instructorStaffId !== undefined) {
    updates.instructor_staff_id = input.instructorStaffId;
  }
  if (input.dayOfWeek !== undefined) updates.day_of_week = input.dayOfWeek;
  if (input.startTime !== undefined) updates.start_time = input.startTime;
  if (input.endTime !== undefined) updates.end_time = input.endTime;
  if (input.capacity !== undefined) updates.capacity = input.capacity;

  const { data, error } = await admin
    .from('classes')
    .update(updates)
    .eq('id', classId)
    .eq('gym_id', gymId)
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data;
}

export async function duplicateClass(
  gymId: string,
  classId: string,
  targetDayOfWeek: string
): Promise<ClassRow> {
  const admin = getAdminClient();
  const { data: source, error } = await admin
    .from('classes')
    .select('*')
    .eq('id', classId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (error) throw new ServiceError(500, error.message);
  if (!source) throw new ServiceError(404, 'Class not found');

  return createClass({
    gymId,
    name: source.name,
    description: (source as { description?: string | null }).description ?? null,
    instructor: source.instructor ?? '',
    instructorStaffId: source.instructor_staff_id,
    dayOfWeek: targetDayOfWeek,
    startTime: source.start_time ?? '09:00',
    endTime: source.end_time ?? '10:00',
    capacity: source.capacity ?? 20,
  });
}

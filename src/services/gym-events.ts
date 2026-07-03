import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type GymEventType = 'open_mat' | 'seminar' | 'tournament' | 'belt_ceremony';

export type GymEvent = {
  id: string;
  gym_id: string;
  title: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  capacity: number | null;
  created_at: string;
};

export type CreateGymEventInput = {
  gymId: string;
  title: string;
  eventType: GymEventType | string;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
  capacity?: number | null;
};

export async function listGymEvents(gymId: string): Promise<GymEvent[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gym_events')
    .select('*')
    .eq('gym_id', gymId)
    .order('event_date', { ascending: true });

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as GymEvent[];
}

export async function createGymEvent(input: CreateGymEventInput): Promise<GymEvent> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gym_events')
    .insert({
      gym_id: input.gymId,
      title: input.title.trim(),
      event_type: input.eventType,
      event_date: input.eventDate,
      start_time: input.startTime ?? null,
      end_time: input.endTime ?? null,
      location: input.location?.trim() || null,
      description: input.description?.trim() || null,
      capacity: input.capacity ?? null,
    })
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as GymEvent;
}

export async function deleteGymEvent(gymId: string, eventId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from('gym_events').delete().eq('id', eventId).eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

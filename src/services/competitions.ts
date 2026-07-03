import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type Competition = {
  id: string;
  gym_id: string;
  member_id: string | null;
  name: string;
  event_date: string | null;
  division: string | null;
  result: string | null;
  notes: string | null;
  created_at: string;
  members: { first_name: string; last_name: string } | null;
};

export type CreateCompetitionInput = {
  gymId: string;
  name: string;
  memberId?: string | null;
  eventDate?: string | null;
  division?: string | null;
  result?: string | null;
  notes?: string | null;
};

export async function listCompetitions(gymId: string): Promise<Competition[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('competitions')
    .select('id, gym_id, member_id, name, event_date, division, result, notes, created_at, members(first_name, last_name)')
    .eq('gym_id', gymId)
    .order('event_date', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as unknown as Competition[];
}

export async function createCompetition(input: CreateCompetitionInput): Promise<Competition> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('competitions')
    .insert({
      gym_id: input.gymId,
      member_id: input.memberId ?? null,
      name: input.name.trim(),
      event_date: input.eventDate ?? null,
      division: input.division?.trim() || null,
      result: input.result?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select('id, gym_id, member_id, name, event_date, division, result, notes, created_at, members(first_name, last_name)')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as unknown as Competition;
}

export async function deleteCompetition(gymId: string, competitionId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('competitions')
    .delete()
    .eq('id', competitionId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

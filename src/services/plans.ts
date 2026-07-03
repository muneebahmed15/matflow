import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';

type PlanRow = Database['public']['Tables']['plans']['Row'];

export async function listActivePlans(gymId: string): Promise<PlanRow[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('plans')
    .select('*')
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

/** All plans for a gym (active and inactive), for admin management views. */
export async function listAllPlans(gymId: string): Promise<PlanRow[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('plans')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export async function setPlanActive(
  gymId: string,
  planId: string,
  isActive: boolean
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('plans')
    .update({ is_active: isActive })
    .eq('id', planId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

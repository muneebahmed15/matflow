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

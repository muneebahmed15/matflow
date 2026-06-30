import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';

type WaiverRow = Database['public']['Tables']['waivers']['Row'];

export async function createWaiver(input: {
  gymId: string;
  title: string;
  body: string;
}): Promise<WaiverRow> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('waivers')
    .insert({
      gym_id: input.gymId,
      title: input.title.trim(),
      body: input.body.trim(),
    })
    .select()
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data;
}

export async function toggleWaiverStatus(
  gymId: string,
  waiverId: string,
  isActive: boolean
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('waivers')
    .update({ is_active: isActive })
    .eq('id', waiverId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

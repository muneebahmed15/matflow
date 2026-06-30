import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';

type GymRow = Database['public']['Tables']['gyms']['Row'];

export type GymSettings = Pick<GymRow, 'id' | 'name' | 'slug' | 'kiosk_enabled'>;

export async function getGymSettings(gymId: string): Promise<GymSettings> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gyms')
    .select('id, name, slug, kiosk_enabled')
    .eq('id', gymId)
    .single();

  if (error || !data) throw new ServiceError(404, 'Gym not found');
  return data;
}

export async function updateGymSettings(
  gymId: string,
  input: { name: string; slug: string; kioskEnabled: boolean }
): Promise<GymSettings> {
  const admin = getAdminClient();
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!input.name.trim()) throw new ServiceError(400, 'Gym name is required.');
  if (!slug) throw new ServiceError(400, 'Gym slug is required.');

  const { data, error } = await admin
    .from('gyms')
    .update({
      name: input.name.trim(),
      slug,
      kiosk_enabled: input.kioskEnabled,
    })
    .eq('id', gymId)
    .select('id, name, slug, kiosk_enabled')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data;
}

export async function getGymName(gymId: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data } = await admin.from('gyms').select('name').eq('id', gymId).maybeSingle();
  return data?.name ?? null;
}

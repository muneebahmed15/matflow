import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type GymLocation = {
  id: string;
  gym_id: string;
  name: string;
  address_line1: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  is_primary: boolean;
  created_at: string;
};

export async function listLocations(gymId: string): Promise<GymLocation[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gym_locations')
    .select('*')
    .eq('gym_id', gymId)
    .order('is_primary', { ascending: false })
    .order('name');

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as GymLocation[];
}

export async function createLocation(input: {
  gymId: string;
  name: string;
  addressLine1?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  isPrimary?: boolean;
}): Promise<GymLocation> {
  const admin = getAdminClient();
  const name = input.name.trim();
  if (!name) throw new ServiceError(400, 'Location name is required.');

  if (input.isPrimary) {
    await admin
      .from('gym_locations')
      .update({ is_primary: false })
      .eq('gym_id', input.gymId);
  }

  const { data, error } = await admin
    .from('gym_locations')
    .insert({
      gym_id: input.gymId,
      name,
      address_line1: input.addressLine1?.trim() || null,
      address_city: input.addressCity?.trim() || null,
      address_state: input.addressState?.trim() || null,
      address_zip: input.addressZip?.trim() || null,
      is_primary: input.isPrimary ?? false,
    })
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as GymLocation;
}

export async function deleteLocation(gymId: string, locationId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('gym_locations')
    .delete()
    .eq('id', locationId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

import { randomBytes, createHash } from 'crypto';
import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type GymApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export async function listApiKeys(gymId: string): Promise<GymApiKey[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gym_api_keys')
    .select('id, name, key_prefix, last_used_at, created_at, revoked_at')
    .eq('gym_id', gymId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as GymApiKey[];
}

export async function createApiKey(
  gymId: string,
  name: string
): Promise<{ key: GymApiKey; rawKey: string }> {
  const trimmed = name.trim();
  if (!trimmed) throw new ServiceError(400, 'Key name is required.');

  const rawKey = `mf_${randomBytes(24).toString('hex')}`;
  const keyPrefix = rawKey.slice(0, 11);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gym_api_keys')
    .insert({
      gym_id: gymId,
      name: trimmed,
      key_prefix: keyPrefix,
      key_hash: hashKey(rawKey),
    })
    .select('id, name, key_prefix, last_used_at, created_at, revoked_at')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return { key: data as GymApiKey, rawKey };
}

export async function revokeApiKey(gymId: string, keyId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('gym_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

export async function validateApiKey(rawKey: string): Promise<{ gymId: string; keyId: string } | null> {
  const admin = getAdminClient();
  const keyHash = hashKey(rawKey);
  const { data } = await admin
    .from('gym_api_keys')
    .select('id, gym_id')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .maybeSingle();

  if (!data) return null;

  await admin
    .from('gym_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return { gymId: data.gym_id, keyId: data.id };
}

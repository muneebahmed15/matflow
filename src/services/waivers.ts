import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';

type WaiverRow = Database['public']['Tables']['waivers']['Row'];

export type Waiver = WaiverRow;

export async function listWaivers(gymId: string): Promise<Waiver[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('waivers')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export async function getWaiver(gymId: string, waiverId: string): Promise<Waiver> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('waivers')
    .select('*')
    .eq('id', waiverId)
    .eq('gym_id', gymId)
    .single();

  if (error || !data) throw new ServiceError(404, 'Waiver not found');
  return data;
}

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

export async function getWaiverSignatures(waiverId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('waiver_signatures')
    .select('*, members(first_name, last_name, email)')
    .eq('waiver_id', waiverId)
    .order('signed_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export async function getMemberWaiverSignatures(memberId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('waiver_signatures')
    .select('*, waivers(title)')
    .eq('member_id', memberId)
    .order('signed_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export async function signWaiver(input: {
  waiverId: string;
  memberId: string;
  gymId: string;
  signedName: string;
}): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from('waiver_signatures').insert({
    waiver_id: input.waiverId,
    member_id: input.memberId,
    gym_id: input.gymId,
    signed_name: input.signedName.trim(),
  });

  if (error) throw new ServiceError(500, error.message);
}

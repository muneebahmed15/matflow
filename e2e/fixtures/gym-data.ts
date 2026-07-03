import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for e2e gym fixtures'
    );
  }
  return createClient(url, serviceKey);
}

export async function getGymIdForUser(userId: string): Promise<string | null> {
  const admin = adminClient();
  const { data: staff } = await admin
    .from('staff_roles')
    .select('gym_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (staff?.gym_id) return staff.gym_id;

  const { data: gym } = await admin
    .from('gyms')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();
  return gym?.id ?? null;
}

export async function ensureWaiverRequiredForCheckin(gymId: string): Promise<void> {
  const admin = adminClient();
  await admin
    .from('gyms')
    .update({ require_waiver_for_checkin: true })
    .eq('id', gymId);
}

export async function createActiveWaiver(
  gymId: string,
  title = 'E2E Liability Waiver'
): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin
    .from('waivers')
    .insert({
      gym_id: gymId,
      title,
      body: 'E2E test waiver — assumption of risk and release of liability.',
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create e2e waiver: ${error?.message}`);
  }
  return data.id;
}

export async function findMemberId(
  gymId: string,
  firstName: string,
  lastName: string
): Promise<string | null> {
  const admin = adminClient();
  const { data } = await admin
    .from('members')
    .select('id')
    .eq('gym_id', gymId)
    .eq('first_name', firstName)
    .eq('last_name', lastName)
    .maybeSingle();
  return data?.id ?? null;
}

export async function deleteWaiver(waiverId: string): Promise<void> {
  const admin = adminClient();
  await admin.from('waiver_signatures').delete().eq('waiver_id', waiverId);
  await admin.from('waivers').delete().eq('id', waiverId);
}

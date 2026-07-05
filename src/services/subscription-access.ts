import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

export async function getActiveSubscriptionForMember(
  gymId: string,
  memberId: string
): Promise<{ id: string; family_id: string | null; status: string } | null> {
  const admin = getAdminClient();

  const { data: direct } = await admin
    .from('subscriptions')
    .select('id, family_id, status')
    .eq('gym_id', gymId)
    .eq('member_id', memberId)
    .in('status', [...ACTIVE_STATUSES])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (direct) return direct as { id: string; family_id: string | null; status: string };

  const { data: member } = await admin
    .from('members')
    .select('family_id')
    .eq('id', memberId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!member?.family_id) return null;

  const { data: familySub } = await admin
    .from('subscriptions')
    .select('id, family_id, status')
    .eq('gym_id', gymId)
    .eq('family_id', member.family_id)
    .in('status', [...ACTIVE_STATUSES])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (familySub as { id: string; family_id: string | null; status: string } | null) ?? null;
}

export async function memberHasSubscriptionAccess(
  gymId: string,
  memberId: string
): Promise<boolean> {
  const sub = await getActiveSubscriptionForMember(gymId, memberId);
  return sub !== null;
}

export async function grantFamilySubscriptionAccess(
  gymId: string,
  familyId: string,
  subscriptionId: string,
  status: string
): Promise<void> {
  const admin = getAdminClient();
  const { data: members } = await admin
    .from('members')
    .select('id')
    .eq('gym_id', gymId)
    .eq('family_id', familyId);

  for (const member of members ?? []) {
    await admin
      .from('members')
      .update({ status: status === 'past_due' ? 'past_due' : 'active' })
      .eq('id', member.id)
      .eq('gym_id', gymId);
  }

  await admin
    .from('subscriptions')
    .update({ family_id: familyId })
    .eq('id', subscriptionId)
    .eq('gym_id', gymId);
}

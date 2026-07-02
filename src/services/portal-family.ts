import { getAdminClient } from '@/lib/supabase/admin';
import type { User } from '@supabase/supabase-js';
import { ServiceError } from '@/services/errors';

export type PortalMemberSummary = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  belt_rank: string;
  status: string;
  family_id: string | null;
};

export async function listFamilyMembersForPortal(
  authMemberId: string,
  gymId: string
): Promise<PortalMemberSummary[]> {
  const admin = getAdminClient();
  const { data: authMember } = await admin
    .from('members')
    .select('id, family_id')
    .eq('id', authMemberId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!authMember?.family_id) {
    const { data: self } = await admin
      .from('members')
      .select('id, first_name, last_name, email, belt_rank, status, family_id')
      .eq('id', authMemberId)
      .single();
    return self ? [self as PortalMemberSummary] : [];
  }

  const { data, error } = await admin
    .from('members')
    .select('id, first_name, last_name, email, belt_rank, status, family_id')
    .eq('gym_id', gymId)
    .eq('family_id', authMember.family_id)
    .order('first_name');

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as PortalMemberSummary[];
}

export async function assertPortalMemberAccess(
  user: User,
  targetMemberId: string
): Promise<{ memberId: string; gymId: string; email: string }> {
  const admin = getAdminClient();
  if (!user.email) throw new ServiceError(401, 'Unauthorized');

  const { data: authMember } = await admin
    .from('members')
    .select('id, gym_id, email, family_id')
    .eq('email', user.email)
    .maybeSingle();

  if (!authMember) throw new ServiceError(403, 'Forbidden');

  if (authMember.id === targetMemberId) {
    return { memberId: authMember.id, gymId: authMember.gym_id, email: authMember.email };
  }

  if (!authMember.family_id) throw new ServiceError(403, 'Forbidden');

  const { data: target } = await admin
    .from('members')
    .select('id, gym_id, email, family_id')
    .eq('id', targetMemberId)
    .eq('gym_id', authMember.gym_id)
    .maybeSingle();

  if (!target || target.family_id !== authMember.family_id) {
    throw new ServiceError(403, 'Forbidden');
  }

  return { memberId: target.id, gymId: target.gym_id, email: authMember.email };
}

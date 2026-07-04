import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';

type FamilyRow = Database['public']['Tables']['families']['Row'];
type MemberRow = Database['public']['Tables']['members']['Row'];

export type FamilyWithCount = Pick<FamilyRow, 'id' | 'family_name' | 'primary_email'> & {
  member_count: number;
};

export type FamilyDetail = Pick<FamilyRow, 'id' | 'family_name' | 'primary_email' | 'created_at'>;

export type FamilyMemberSummary = Pick<
  MemberRow,
  'id' | 'first_name' | 'last_name' | 'email' | 'status' | 'belt_rank' | 'auth_user_id'
>;

export async function listFamiliesWithCounts(gymId: string): Promise<FamilyWithCount[]> {
  const admin = getAdminClient();
  const { data: families, error } = await admin
    .from('families')
    .select('id, family_name, primary_email')
    .eq('gym_id', gymId)
    .order('family_name');

  if (error) throw new ServiceError(500, error.message);

  const rows: FamilyWithCount[] = [];
  for (const family of families ?? []) {
    const { count } = await admin
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', family.id);
    rows.push({ ...family, member_count: count ?? 0 });
  }
  return rows;
}

export async function getFamilyWithMembers(
  gymId: string,
  familyId: string
): Promise<{ family: FamilyDetail; members: FamilyMemberSummary[] } | null> {
  const admin = getAdminClient();

  const [{ data: family, error: famErr }, { data: members, error: memErr }] = await Promise.all([
    admin
      .from('families')
      .select('id, family_name, primary_email, created_at')
      .eq('id', familyId)
      .eq('gym_id', gymId)
      .maybeSingle(),
    admin
      .from('members')
      .select('id, first_name, last_name, email, status, belt_rank, auth_user_id')
      .eq('family_id', familyId)
      .eq('gym_id', gymId)
      .order('first_name'),
  ]);

  if (famErr) throw new ServiceError(500, famErr.message);
  if (memErr) throw new ServiceError(500, memErr.message);
  if (!family) return null;

  return {
    family: family as FamilyDetail,
    members: (members ?? []) as FamilyMemberSummary[],
  };
}

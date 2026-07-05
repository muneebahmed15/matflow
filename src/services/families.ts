import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';

type FamilyRow = Database['public']['Tables']['families']['Row'];
type MemberRow = Database['public']['Tables']['members']['Row'];

export type FamilyWithCount = Pick<FamilyRow, 'id' | 'family_name' | 'primary_email'> & {
  member_count: number;
};

export type FamilyDetail = Pick<
  FamilyRow,
  'id' | 'family_name' | 'primary_email' | 'created_at' | 'billing_member_id'
>;

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
      .select('id, family_name, primary_email, created_at, billing_member_id')
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

export async function setFamilyBillingContact(
  gymId: string,
  familyId: string,
  billingMemberId: string | null
): Promise<FamilyDetail> {
  const admin = getAdminClient();

  if (billingMemberId) {
    const { data: member } = await admin
      .from('members')
      .select('id')
      .eq('id', billingMemberId)
      .eq('family_id', familyId)
      .eq('gym_id', gymId)
      .maybeSingle();
    if (!member) throw new ServiceError(400, 'Billing contact must be a member of this family.');
  }

  const { data, error } = await admin
    .from('families')
    .update({ billing_member_id: billingMemberId })
    .eq('id', familyId)
    .eq('gym_id', gymId)
    .select('id, family_name, primary_email, created_at, billing_member_id')
    .single();

  if (error || !data) throw new ServiceError(500, error?.message ?? 'Update failed');
  return data as FamilyDetail;
}

export async function mergeFamilies(
  gymId: string,
  targetFamilyId: string,
  sourceFamilyId: string
): Promise<FamilyDetail> {
  if (targetFamilyId === sourceFamilyId) {
    throw new ServiceError(400, 'Cannot merge a family into itself.');
  }

  const admin = getAdminClient();
  const { data: target } = await admin
    .from('families')
    .select('id, family_name, primary_email, billing_member_id, stripe_customer_id')
    .eq('id', targetFamilyId)
    .eq('gym_id', gymId)
    .maybeSingle();

  const { data: source } = await admin
    .from('families')
    .select('id, stripe_customer_id, primary_email')
    .eq('id', sourceFamilyId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!target || !source) throw new ServiceError(404, 'Family not found.');

  const { error: moveErr } = await admin
    .from('members')
    .update({ family_id: targetFamilyId })
    .eq('family_id', sourceFamilyId)
    .eq('gym_id', gymId);

  if (moveErr) throw new ServiceError(500, moveErr.message);

  const updates: Record<string, unknown> = {};
  if (!target.primary_email && source.primary_email) {
    updates.primary_email = source.primary_email;
  }
  if (!target.stripe_customer_id && source.stripe_customer_id) {
    updates.stripe_customer_id = source.stripe_customer_id;
  }
  if (Object.keys(updates).length > 0) {
    await admin.from('families').update(updates).eq('id', targetFamilyId);
  }

  const { error: delErr } = await admin.from('families').delete().eq('id', sourceFamilyId);
  if (delErr) throw new ServiceError(500, delErr.message);

  const { data: merged, error } = await admin
    .from('families')
    .select('id, family_name, primary_email, created_at, billing_member_id')
    .eq('id', targetFamilyId)
    .single();

  if (error || !merged) throw new ServiceError(500, error?.message ?? 'Merge failed');
  return merged as FamilyDetail;
}

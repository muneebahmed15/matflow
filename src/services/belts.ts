import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';

type BeltPromotionRow = Database['public']['Tables']['belt_promotions']['Row'];
type MemberRow = Database['public']['Tables']['members']['Row'];

export type BeltPromotionWithMember = BeltPromotionRow & {
  members: Pick<MemberRow, 'first_name' | 'last_name'> | null;
};

export async function listRecentPromotions(
  gymId: string,
  limit = 20
): Promise<BeltPromotionWithMember[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('belt_promotions')
    .select('*, members(first_name, last_name)')
    .eq('gym_id', gymId)
    .order('promoted_at', { ascending: false })
    .limit(limit);

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as BeltPromotionWithMember[];
}

export async function promoteMember(input: {
  gymId: string;
  memberId: string;
  fromBelt: string;
  toBelt: string;
  notes?: string;
}): Promise<void> {
  const admin = getAdminClient();

  const { error: promoErr } = await admin.from('belt_promotions').insert({
    gym_id: input.gymId,
    member_id: input.memberId,
    from_belt: input.fromBelt,
    to_belt: input.toBelt,
    notes: input.notes?.trim() || null,
    promoted_at: new Date().toISOString(),
  });

  if (promoErr) throw new ServiceError(500, promoErr.message);

  const { error: memberErr } = await admin
    .from('members')
    .update({ belt_rank: input.toBelt })
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId);

  if (memberErr) throw new ServiceError(500, memberErr.message);
}

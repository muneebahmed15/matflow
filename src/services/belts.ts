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

export async function listMemberPromotions(
  gymId: string,
  memberId: string
): Promise<BeltPromotionRow[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('belt_promotions')
    .select('*')
    .eq('gym_id', gymId)
    .eq('member_id', memberId)
    .order('promoted_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as BeltPromotionRow[];
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
    .update({ belt_rank: input.toBelt, stripe_count: 0 })
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId);

  if (memberErr) throw new ServiceError(500, memberErr.message);
}

export async function updateMemberStripes(input: {
  gymId: string;
  memberId: string;
  stripeCount: number;
  notes?: string;
}): Promise<void> {
  if (input.stripeCount < 0 || input.stripeCount > 4) {
    throw new ServiceError(400, 'Stripe count must be 0–4');
  }

  const admin = getAdminClient();

  const { error: memberErr } = await admin
    .from('members')
    .update({ stripe_count: input.stripeCount })
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId);

  if (memberErr) throw new ServiceError(500, memberErr.message);

  await admin.from('belt_stripe_events').insert({
    gym_id: input.gymId,
    member_id: input.memberId,
    stripe_count: input.stripeCount,
    notes: input.notes?.trim() || null,
  });
}

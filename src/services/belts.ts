import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';
import { logAuditEvent } from '@/services/audit';
import {
  evaluateReadiness,
  isDemotion,
  isValidBelt,
  resolveBeltSystem,
  type BeltRequirement,
  type BeltSystem,
} from '@/lib/belt-systems';
import { stringifyCsv } from '@/lib/csv';

type BeltPromotionRow = Database['public']['Tables']['belt_promotions']['Row'];
type MemberRow = Database['public']['Tables']['members']['Row'];

export type BeltPromotionWithMember = BeltPromotionRow & {
  members: Pick<MemberRow, 'first_name' | 'last_name'> | null;
};

export async function getGymBeltSystem(gymId: string): Promise<BeltSystem> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('gyms')
    .select('belt_system, belt_custom_order')
    .eq('id', gymId)
    .maybeSingle();

  return resolveBeltSystem(
    (data as { belt_system?: string } | null)?.belt_system,
    (data as { belt_custom_order?: unknown } | null)?.belt_custom_order
  );
}

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
  ceremonyDate?: string | null;
  actorId?: string | null;
  allowDemotion?: boolean;
}): Promise<void> {
  const admin = getAdminClient();
  const system = await getGymBeltSystem(input.gymId);

  const toBelt = input.toBelt.trim().toLowerCase();
  const fromBelt = input.fromBelt.trim().toLowerCase();

  if (!isValidBelt(system, toBelt)) {
    throw new ServiceError(
      400,
      `"${input.toBelt}" is not a valid rank in this gym's belt system (${system.label}).`
    );
  }

  if (isDemotion(system, fromBelt, toBelt) && !input.allowDemotion) {
    throw new ServiceError(
      403,
      'This promotion goes to a lower or equal rank. Only an admin can log a demotion.'
    );
  }

  const { error: promoErr } = await admin.from('belt_promotions').insert({
    gym_id: input.gymId,
    member_id: input.memberId,
    from_belt: fromBelt,
    to_belt: toBelt,
    notes: input.notes?.trim() || null,
    promoted_at: new Date().toISOString(),
    ceremony_date: input.ceremonyDate || null,
    created_by: input.actorId ?? null,
  });

  if (promoErr) throw new ServiceError(500, promoErr.message);

  const { error: memberErr } = await admin
    .from('members')
    .update({ belt_rank: toBelt, stripe_count: 0 })
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId);

  if (memberErr) throw new ServiceError(500, memberErr.message);

  try {
    await logAuditEvent({
      gymId: input.gymId,
      actorId: input.actorId ?? null,
      action: 'belt.promoted',
      entityType: 'member',
      entityId: input.memberId,
      payload: { from: fromBelt, to: toBelt },
    });
  } catch {
    // Audit is best-effort
  }
}

/** Undo the most recent promotion for a member and revert their rank. */
export async function undoPromotion(
  gymId: string,
  promotionId: string,
  actorId?: string | null
): Promise<void> {
  const admin = getAdminClient();

  const { data: promo } = await admin
    .from('belt_promotions')
    .select('id, member_id, from_belt, to_belt, promoted_at')
    .eq('id', promotionId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!promo) throw new ServiceError(404, 'Promotion not found.');

  const { data: latest } = await admin
    .from('belt_promotions')
    .select('id')
    .eq('gym_id', gymId)
    .eq('member_id', promo.member_id)
    .order('promoted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.id !== promo.id) {
    throw new ServiceError(
      409,
      'Only the most recent promotion for a member can be undone.'
    );
  }

  const { error: deleteErr } = await admin
    .from('belt_promotions')
    .delete()
    .eq('id', promo.id)
    .eq('gym_id', gymId);

  if (deleteErr) throw new ServiceError(500, deleteErr.message);

  const { error: memberErr } = await admin
    .from('members')
    .update({ belt_rank: promo.from_belt })
    .eq('id', promo.member_id)
    .eq('gym_id', gymId);

  if (memberErr) throw new ServiceError(500, memberErr.message);

  try {
    await logAuditEvent({
      gymId,
      actorId: actorId ?? null,
      action: 'belt.promotion_undone',
      entityType: 'member',
      entityId: promo.member_id,
      payload: { reverted_to: promo.from_belt, undone_promotion_to: promo.to_belt },
    });
  } catch {
    // Audit is best-effort
  }
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

// ---------------------------------------------------------------------------
// Requirements & promotion readiness
// ---------------------------------------------------------------------------

export type BeltRequirementRow = {
  id: string;
  belt: string;
  min_attendance: number;
  min_days_at_rank: number;
  techniques_checklist: string | null;
};

export async function listBeltRequirements(gymId: string): Promise<BeltRequirementRow[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('belt_requirements')
    .select('id, belt, min_attendance, min_days_at_rank, techniques_checklist')
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as BeltRequirementRow[];
}

export async function upsertBeltRequirement(input: {
  gymId: string;
  belt: string;
  minAttendance: number;
  minDaysAtRank: number;
  techniquesChecklist?: string | null;
}): Promise<void> {
  if (input.minAttendance < 0 || input.minDaysAtRank < 0) {
    throw new ServiceError(400, 'Requirements must be zero or positive.');
  }

  const system = await getGymBeltSystem(input.gymId);
  const belt = input.belt.trim().toLowerCase();
  if (!isValidBelt(system, belt)) {
    throw new ServiceError(400, `"${input.belt}" is not a valid rank in this gym's belt system.`);
  }

  const admin = getAdminClient();
  const { error } = await admin.from('belt_requirements').upsert(
    {
      gym_id: input.gymId,
      belt,
      min_attendance: input.minAttendance,
      min_days_at_rank: input.minDaysAtRank,
      techniques_checklist: input.techniquesChecklist?.trim() || null,
    },
    { onConflict: 'gym_id,belt' }
  );

  if (error) throw new ServiceError(500, error.message);
}

export type MemberReadiness = {
  memberId: string;
  firstName: string;
  lastName: string;
  belt: string;
  stripeCount: number;
  daysAtRank: number;
  attendanceSinceRank: number;
  ready: boolean;
  missingAttendance: number;
  missingDays: number;
  hasRequirement: boolean;
};

/**
 * Promotion readiness report: for each active member, days at current rank
 * and attendance since last promotion, evaluated against the gym's per-belt
 * requirements.
 */
export async function getPromotionReadiness(gymId: string): Promise<MemberReadiness[]> {
  const admin = getAdminClient();

  const [{ data: members, error: mErr }, { data: promos, error: pErr }, requirements] =
    await Promise.all([
      admin
        .from('members')
        .select('id, first_name, last_name, belt_rank, stripe_count, created_at')
        .eq('gym_id', gymId)
        .eq('status', 'active'),
      admin
        .from('belt_promotions')
        .select('member_id, promoted_at')
        .eq('gym_id', gymId)
        .order('promoted_at', { ascending: false }),
      listBeltRequirements(gymId),
    ]);

  if (mErr) throw new ServiceError(500, mErr.message);
  if (pErr) throw new ServiceError(500, pErr.message);

  const lastPromotion = new Map<string, string>();
  for (const p of promos ?? []) {
    if (!lastPromotion.has(p.member_id)) lastPromotion.set(p.member_id, p.promoted_at);
  }

  const requirementByBelt = new Map<string, BeltRequirement>(
    requirements.map((r) => [
      r.belt,
      { belt: r.belt, minAttendance: r.min_attendance, minDaysAtRank: r.min_days_at_rank },
    ])
  );

  const now = Date.now();
  const results: MemberReadiness[] = [];

  for (const member of members ?? []) {
    const rankSince = lastPromotion.get(member.id) ?? member.created_at;
    const daysAtRank = Math.floor((now - new Date(rankSince).getTime()) / 86_400_000);
    const belt = (member.belt_rank ?? 'white').toLowerCase();

    const { count } = await admin
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('member_id', member.id)
      .gte('checked_in_at', rankSince);

    const requirement = requirementByBelt.get(belt) ?? null;
    const readiness = evaluateReadiness({
      belt,
      daysAtRank,
      attendanceSinceRank: count ?? 0,
      requirement,
    });

    results.push({
      memberId: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      belt,
      stripeCount: member.stripe_count ?? 0,
      daysAtRank,
      attendanceSinceRank: count ?? 0,
      ready: readiness.ready,
      missingAttendance: readiness.missingAttendance,
      missingDays: readiness.missingDays,
      hasRequirement: requirement !== null,
    });
  }

  return results.sort((a, b) => Number(b.ready) - Number(a.ready) || b.daysAtRank - a.daysAtRank);
}

/** Members with no promotion in the given number of months (stagnant list). */
export async function getStagnantMembers(
  gymId: string,
  months = 12
): Promise<MemberReadiness[]> {
  const readiness = await getPromotionReadiness(gymId);
  const thresholdDays = months * 30;
  return readiness.filter((r) => r.daysAtRank >= thresholdDays);
}

export async function exportMembersByBeltCsv(gymId: string): Promise<string> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('members')
    .select('first_name, last_name, email, belt_rank, stripe_count, status, created_at')
    .eq('gym_id', gymId)
    .order('belt_rank')
    .order('last_name');

  if (error) throw new ServiceError(500, error.message);

  const rows = (data ?? []).map((m) => [
    m.first_name ?? '',
    m.last_name ?? '',
    m.email ?? '',
    m.belt_rank ?? '',
    String(m.stripe_count ?? 0),
    m.status ?? '',
    m.created_at ?? '',
  ]);

  return stringifyCsv(
    ['First Name', 'Last Name', 'Email', 'Belt', 'Stripes', 'Status', 'Joined'],
    rows
  );
}

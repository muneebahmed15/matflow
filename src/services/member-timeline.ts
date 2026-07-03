import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type TimelineEvent = {
  id: string;
  type: 'note' | 'attendance' | 'promotion' | 'waiver' | 'subscription';
  at: string;
  title: string;
  detail: string | null;
};

/**
 * Unified interaction timeline for a member: CRM notes, check-ins, belt
 * promotions, waiver signatures, and subscription starts, newest first.
 */
export async function getMemberTimeline(
  gymId: string,
  memberId: string,
  limit = 50
): Promise<TimelineEvent[]> {
  const admin = getAdminClient();

  const [notes, attendance, promotions, signatures, subscriptions] = await Promise.all([
    admin
      .from('crm_notes')
      .select('id, note_type, body, created_at')
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(limit),
    admin
      .from('attendance')
      .select('id, checked_in_at, notes')
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .order('checked_in_at', { ascending: false })
      .limit(limit),
    admin
      .from('belt_promotions')
      .select('id, from_belt, to_belt, promoted_at, notes')
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .order('promoted_at', { ascending: false })
      .limit(limit),
    admin
      .from('waiver_signatures')
      .select('id, signed_at, signed_name, waivers(title)')
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .order('signed_at', { ascending: false })
      .limit(limit),
    admin
      .from('subscriptions')
      .select('id, created_at, status, plans(name)')
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  for (const result of [notes, attendance, promotions, signatures, subscriptions]) {
    if (result.error) throw new ServiceError(500, result.error.message);
  }

  const events: TimelineEvent[] = [];

  for (const n of notes.data ?? []) {
    events.push({
      id: `note-${n.id}`,
      type: 'note',
      at: n.created_at,
      title: `Note (${n.note_type})`,
      detail: n.body,
    });
  }

  for (const a of attendance.data ?? []) {
    events.push({
      id: `att-${a.id}`,
      type: 'attendance',
      at: a.checked_in_at,
      title: 'Checked in',
      detail: a.notes,
    });
  }

  for (const p of promotions.data ?? []) {
    events.push({
      id: `promo-${p.id}`,
      type: 'promotion',
      at: p.promoted_at,
      title: `Promoted ${p.from_belt} → ${p.to_belt}`,
      detail: p.notes,
    });
  }

  for (const s of signatures.data ?? []) {
    const waiver = s as unknown as { waivers: { title: string } | null };
    events.push({
      id: `sig-${s.id}`,
      type: 'waiver',
      at: s.signed_at,
      title: `Signed waiver: ${waiver.waivers?.title ?? 'Waiver'}`,
      detail: `Signed as ${s.signed_name}`,
    });
  }

  for (const sub of subscriptions.data ?? []) {
    const plan = sub as unknown as { plans: { name: string } | null };
    events.push({
      id: `sub-${sub.id}`,
      type: 'subscription',
      at: sub.created_at,
      title: `Subscription started: ${plan.plans?.name ?? 'plan'}`,
      detail: `Status: ${sub.status}`,
    });
  }

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { monthlyContributionCents } from '@/services/revenue';

export type ClassRevenueAttribution = {
  classId: string;
  enrolledMembers: number;
  attributedMrrCents: number;
  dropInBookings30d: number;
  sharePercent: number;
};

type SubWithPlan = {
  member_id: string;
  plans: { price_cents: number | null; interval: string } | null;
};

/** Split member MRR evenly across their active class enrollments. Exported for tests. */
export function attributeEnrollmentMrr(
  enrollments: { class_id: string; member_id: string }[],
  memberMrr: Map<string, number>
): Map<string, number> {
  const enrollmentsByMember = new Map<string, Set<string>>();

  for (const row of enrollments) {
    if (!enrollmentsByMember.has(row.member_id)) {
      enrollmentsByMember.set(row.member_id, new Set());
    }
    enrollmentsByMember.get(row.member_id)!.add(row.class_id);
  }

  const attributedByClass = new Map<string, number>();
  for (const [memberId, classSet] of enrollmentsByMember) {
    const mrr = memberMrr.get(memberId);
    if (!mrr) continue;
    const share = mrr / classSet.size;
    for (const classId of classSet) {
      attributedByClass.set(classId, (attributedByClass.get(classId) ?? 0) + share);
    }
  }

  return attributedByClass;
}

/** Attribute subscription MRR to classes based on active enrollments (split evenly per member). */
export async function getClassRevenueReport(gymId: string): Promise<ClassRevenueAttribution[]> {
  const admin = getAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  const [{ data: enrollments, error: enrollError }, { data: classes, error: classError }] =
    await Promise.all([
      admin
        .from('class_enrollments')
        .select('class_id, member_id')
        .eq('gym_id', gymId)
        .eq('status', 'active'),
      admin.from('classes').select('id').eq('gym_id', gymId).eq('is_active', true),
    ]);

  if (enrollError) throw new ServiceError(500, enrollError.message);
  if (classError) throw new ServiceError(500, classError.message);

  const classIds = (classes ?? []).map((c) => c.id);
  if (classIds.length === 0) return [];

  const enrollmentsByClass = new Map<string, Set<string>>();
  for (const row of enrollments ?? []) {
    if (!enrollmentsByClass.has(row.class_id)) {
      enrollmentsByClass.set(row.class_id, new Set());
    }
    enrollmentsByClass.get(row.class_id)!.add(row.member_id);
  }

  const memberIds = [...new Set((enrollments ?? []).map((row) => row.member_id))];
  const memberMrr = new Map<string, number>();

  if (memberIds.length > 0) {
    const { data: subs, error: subError } = await admin
      .from('subscriptions')
      .select('member_id, plans(price_cents, interval)')
      .eq('gym_id', gymId)
      .in('member_id', memberIds)
      .in('status', ['active', 'trialing']);

    if (subError) throw new ServiceError(500, subError.message);

    for (const sub of (subs ?? []) as unknown as SubWithPlan[]) {
      const contribution = monthlyContributionCents(
        sub.plans?.price_cents ?? null,
        sub.plans?.interval ?? 'month'
      );
      if (contribution <= 0) continue;
      memberMrr.set(sub.member_id, (memberMrr.get(sub.member_id) ?? 0) + contribution);
    }
  }

  const attributedByClass = attributeEnrollmentMrr(enrollments ?? [], memberMrr);

  const { data: sessions, error: sessionError } = await admin
    .from('class_sessions')
    .select('id, class_id')
    .eq('gym_id', gymId)
    .gte('session_date', since)
    .in('class_id', classIds);

  if (sessionError) throw new ServiceError(500, sessionError.message);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const dropInsByClass = new Map<string, number>();

  if (sessionIds.length > 0) {
    const { data: bookings, error: bookingError } = await admin
      .from('class_session_bookings')
      .select('session_id')
      .eq('gym_id', gymId)
      .eq('status', 'booked')
      .in('session_id', sessionIds);

    if (bookingError) throw new ServiceError(500, bookingError.message);

    const sessionClass = new Map((sessions ?? []).map((s) => [s.id, s.class_id]));
    for (const booking of bookings ?? []) {
      const classId = sessionClass.get(booking.session_id);
      if (!classId) continue;
      dropInsByClass.set(classId, (dropInsByClass.get(classId) ?? 0) + 1);
    }
  }

  const totalAttributed = [...attributedByClass.values()].reduce((sum, value) => sum + value, 0);

  return classIds.map((classId) => {
    const attributedMrrCents = Math.round(attributedByClass.get(classId) ?? 0);
    return {
      classId,
      enrolledMembers: enrollmentsByClass.get(classId)?.size ?? 0,
      attributedMrrCents,
      dropInBookings30d: dropInsByClass.get(classId) ?? 0,
      sharePercent:
        totalAttributed > 0
          ? Math.round(((attributedByClass.get(classId) ?? 0) / totalAttributed) * 1000) / 10
          : 0,
    };
  });
}

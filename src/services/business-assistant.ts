import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type BusinessMetrics = {
  newLeads7d: number;
  pastDueMembers: number;
  inactiveMembers14d: number;
  failedPayments: number;
  readyForPromotion: number;
  lowAttendanceClasses: number;
};

export type BusinessRecommendation = {
  priority: 'P1' | 'P2' | 'P3';
  title: string;
  description: string;
  actionHref?: string;
};

export async function computeGymMetrics(gymId: string): Promise<BusinessMetrics> {
  const admin = getAdminClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [
    { count: newLeads7d },
    { count: pastDueMembers },
    { data: activeMembers },
    { count: failedPayments },
  ] = await Promise.all([
    admin
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .gte('created_at', sevenDaysAgo.toISOString()),
    admin
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'past_due'),
    admin.from('members').select('id').eq('gym_id', gymId).eq('status', 'active'),
    admin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'past_due'),
  ]);

  let inactiveMembers14d = 0;
  const memberIds = (activeMembers ?? []).map((m) => m.id);

  if (memberIds.length > 0) {
    const { data: recentAttendance } = await admin
      .from('attendance')
      .select('member_id')
      .eq('gym_id', gymId)
      .gte('checked_in_at', fourteenDaysAgo.toISOString());

    const checkedIn = new Set((recentAttendance ?? []).map((a) => a.member_id));
    inactiveMembers14d = memberIds.filter((id) => !checkedIn.has(id)).length;
  }

  const { data: promotions } = await admin
    .from('belt_promotions')
    .select('member_id, promoted_at')
    .eq('gym_id', gymId)
    .gte('promoted_at', fourteenDaysAgo.toISOString());

  const recentlyPromoted = new Set((promotions ?? []).map((p) => p.member_id));

  const { data: attendanceCounts } = await admin
    .from('attendance')
    .select('member_id')
    .eq('gym_id', gymId)
    .gte('checked_in_at', fourteenDaysAgo.toISOString());

  const attendanceByMember = new Map<string, number>();
  for (const a of attendanceCounts ?? []) {
    attendanceByMember.set(a.member_id, (attendanceByMember.get(a.member_id) ?? 0) + 1);
  }

  let readyForPromotion = 0;
  for (const id of memberIds) {
    if (!recentlyPromoted.has(id) && (attendanceByMember.get(id) ?? 0) >= 8) {
      readyForPromotion++;
    }
  }

  return {
    newLeads7d: newLeads7d ?? 0,
    pastDueMembers: pastDueMembers ?? 0,
    inactiveMembers14d,
    failedPayments: failedPayments ?? 0,
    readyForPromotion,
    lowAttendanceClasses: 0,
  };
}

export function metricsToRecommendations(metrics: BusinessMetrics): BusinessRecommendation[] {
  const recs: BusinessRecommendation[] = [];

  if (metrics.pastDueMembers > 0) {
    recs.push({
      priority: 'P1',
      title: `${metrics.pastDueMembers} member(s) past due`,
      description: 'Reach out or send payment update links to recover revenue.',
      actionHref: '/subscriptions',
    });
  }

  if (metrics.inactiveMembers14d > 0) {
    recs.push({
      priority: 'P1',
      title: `${metrics.inactiveMembers14d} inactive member(s)`,
      description: 'No check-in in 14+ days. Consider a win-back email or call.',
      actionHref: '/members',
    });
  }

  if (metrics.newLeads7d > 0) {
    recs.push({
      priority: 'P2',
      title: `${metrics.newLeads7d} new lead(s) this week`,
      description: 'Follow up while interest is high.',
      actionHref: '/leads',
    });
  }

  if (metrics.readyForPromotion > 0) {
    recs.push({
      priority: 'P2',
      title: `${metrics.readyForPromotion} member(s) may be ready for promotion`,
      description: '8+ check-ins in 14 days with no recent promotion.',
      actionHref: '/belts',
    });
  }

  return recs;
}

export async function saveDailySnapshot(gymId: string): Promise<void> {
  const admin = getAdminClient();
  const metrics = await computeGymMetrics(gymId);
  const recommendations = metricsToRecommendations(metrics);
  const today = new Date().toISOString().split('T')[0];

  await admin.from('business_snapshots').upsert(
    {
      gym_id: gymId,
      snapshot_date: today,
      metrics,
      recommendations,
    },
    { onConflict: 'gym_id,snapshot_date' }
  );
}

export async function getLatestSnapshot(gymId: string) {
  const admin = getAdminClient();
  const { data } = await admin
    .from('business_snapshots')
    .select('*')
    .eq('gym_id', gymId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) return data;

  const metrics = await computeGymMetrics(gymId);
  return {
    metrics,
    recommendations: metricsToRecommendations(metrics),
    snapshot_date: new Date().toISOString().split('T')[0],
  };
}

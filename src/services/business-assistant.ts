import { getAdminClient } from '@/lib/supabase/admin';
import { isLowAttendanceClass, lowAttendanceDescription } from '@/lib/class-attendance-alerts';
import { ServiceError } from '@/services/errors';

export type BusinessMetrics = {
  newLeads7d: number;
  newLeads24h: number;
  leadsNotContacted48h: number;
  pastDueMembers: number;
  inactiveMembers14d: number;
  inactiveMembers30d: number;
  failedPayments: number;
  readyForPromotion: number;
  lowAttendanceClasses: number;
  waiverGapMembers: number;
  trialLeadsOpen: number;
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
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { count: newLeads7d },
    { count: newLeads24h },
    { count: leadsNotContacted48h },
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
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .gte('created_at', oneDayAgo.toISOString()),
    admin
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'new')
      .lt('created_at', twoDaysAgo.toISOString()),
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
  let inactiveMembers30d = 0;
  const memberIds = (activeMembers ?? []).map((m) => m.id);

  if (memberIds.length > 0) {
    const { data: recentAttendance14 } = await admin
      .from('attendance')
      .select('member_id')
      .eq('gym_id', gymId)
      .gte('checked_in_at', fourteenDaysAgo.toISOString());

    const { data: recentAttendance30 } = await admin
      .from('attendance')
      .select('member_id')
      .eq('gym_id', gymId)
      .gte('checked_in_at', thirtyDaysAgo.toISOString());

    const checkedIn14 = new Set((recentAttendance14 ?? []).map((a) => a.member_id));
    const checkedIn30 = new Set((recentAttendance30 ?? []).map((a) => a.member_id));
    inactiveMembers14d = memberIds.filter((id) => !checkedIn14.has(id)).length;
    inactiveMembers30d = memberIds.filter((id) => !checkedIn30.has(id)).length;
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

  const { getClassAttendanceReport } = await import('@/services/class-dropin');
  const classReport = await getClassAttendanceReport(gymId, 30);

  const { data: classRows } = await admin
    .from('classes')
    .select('id, capacity')
    .eq('gym_id', gymId)
    .eq('is_active', true);

  const capacityByClass = new Map((classRows ?? []).map((c) => [c.id, c.capacity ?? 0]));
  const lowAttendanceClasses = classReport.filter((r) =>
    isLowAttendanceClass({
      avgPerSession: r.avgPerSession,
      capacity: capacityByClass.get(r.classId) ?? 0,
      sessions: r.sessions,
    })
  ).length;

  const { listMembersWithWaiverGaps } = await import('@/services/waivers');
  const waiverGaps = await listMembersWithWaiverGaps(gymId);

  const { count: trialLeadsOpen } = await admin
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .in('status', ['new', 'contacted', 'trial_scheduled']);

  return {
    newLeads7d: newLeads7d ?? 0,
    newLeads24h: newLeads24h ?? 0,
    leadsNotContacted48h: leadsNotContacted48h ?? 0,
    pastDueMembers: pastDueMembers ?? 0,
    inactiveMembers14d,
    inactiveMembers30d,
    failedPayments: failedPayments ?? 0,
    readyForPromotion,
    lowAttendanceClasses,
    waiverGapMembers: waiverGaps.length,
    trialLeadsOpen: trialLeadsOpen ?? 0,
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

  if (metrics.leadsNotContacted48h > 0) {
    recs.push({
      priority: 'P1',
      title: `${metrics.leadsNotContacted48h} lead(s) not contacted in 48h+`,
      description: 'New leads waiting for first outreach.',
      actionHref: '/leads',
    });
  }

  if (metrics.inactiveMembers30d > metrics.inactiveMembers14d) {
    recs.push({
      priority: 'P2',
      title: `${metrics.inactiveMembers30d} inactive 30+ days`,
      description: 'Long-term absent members may need a win-back campaign.',
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

  if (metrics.waiverGapMembers > 0) {
    recs.push({
      priority: 'P2',
      title: `${metrics.waiverGapMembers} member(s) missing waivers`,
      description: 'Send waiver links or review compliance before check-in blocks.',
      actionHref: '/waivers',
    });
  }

  if (metrics.lowAttendanceClasses > 0) {
    recs.push({
      priority: 'P3',
      title: `${metrics.lowAttendanceClasses} class(es) with low attendance`,
      description: lowAttendanceDescription(),
      actionHref: '/classes',
    });
  }

  if (metrics.trialLeadsOpen > 0) {
    recs.push({
      priority: 'P3',
      title: `${metrics.trialLeadsOpen} open trial lead(s)`,
      description: 'Confirm trials and follow up while interest is fresh.',
      actionHref: '/leads',
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

export async function listDigestHistory(
  gymId: string,
  limit = 30
): Promise<
  {
    snapshot_date: string;
    metrics: BusinessMetrics;
    recommendations: BusinessRecommendation[];
  }[]
> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('business_snapshots')
    .select('snapshot_date, metrics, recommendations')
    .eq('gym_id', gymId)
    .order('snapshot_date', { ascending: false })
    .limit(limit);

  if (error) throw new ServiceError(500, error.message);

  return (data ?? []).map((row) => ({
    snapshot_date: row.snapshot_date as string,
    metrics: row.metrics as BusinessMetrics,
    recommendations: (row.recommendations ?? []) as BusinessRecommendation[],
  }));
}

import { getAdminClient } from '@/lib/supabase/admin';
import { isLowAttendanceClass, lowAttendanceDescription } from '@/lib/class-attendance-alerts';
import {
  parseDigestSections,
  recommendationSection,
  type DigestSections,
} from '@/lib/digest-sections';
import { marketingTipForMetrics } from '@/lib/marketing-tips';
import { ServiceError } from '@/services/errors';

export type BusinessMetrics = {
  newLeads7d: number;
  newLeads24h: number;
  leadsNotContacted48h: number;
  trialsScheduledToday: number;
  newMembersThisWeek: number;
  upcomingRenewals7d: number;
  cancelledClassesThisWeek: number;
  pastDueMembers: number;
  inactiveMembers14d: number;
  inactiveMembers30d: number;
  inactiveByThreshold: number;
  inactiveThresholdDays: number;
  failedPayments: number;
  readyForPromotion: number;
  lowAttendanceClasses: number;
  waiverGapMembers: number;
  trialLeadsOpen: number;
  aiConversationsNeedingFollowUp: number;
  escalationQueueSize: number;
  leadConversionRate7d: number;
  mrrCents: number;
  mrrChangePercent: number | null;
  atRiskChurnCount: number;
  peakHours: number[];
  beltCeremonyCandidates: number;
  missedCalls7d: number;
};

export type BusinessRecommendation = {
  priority: 'P1' | 'P2' | 'P3';
  title: string;
  description: string;
  actionHref?: string;
  actionKey: string;
  draftEmail?: string;
};

export function recommendationActionKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function computeGymMetrics(gymId: string): Promise<BusinessMetrics> {
  const admin = getAdminClient();
  const { data: gymRow } = await admin
    .from('gyms')
    .select('digest_inactive_days')
    .eq('id', gymId)
    .maybeSingle();
  const inactiveThresholdDays = gymRow?.digest_inactive_days ?? 14;

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
  const thresholdAgo = new Date();
  thresholdAgo.setDate(thresholdAgo.getDate() - inactiveThresholdDays);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = sevenDaysAgo.toISOString();

  const [
    { count: newLeads7d },
    { count: newLeads24h },
    { count: leadsNotContacted48h },
    { count: trialsScheduledToday },
    { count: newMembersThisWeek },
    { count: upcomingRenewals7d },
    { count: cancelledClassesThisWeek },
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
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'trial_scheduled')
      .gte('updated_at', `${today}T00:00:00.000Z`),
    admin
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .gte('created_at', weekStart),
    admin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString())
      .lte('current_period_end', sevenDaysFromNow.toISOString()),
    admin
      .from('class_schedule_exceptions')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .gte('exception_date', weekStart),
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
  let inactiveByThreshold = 0;
  const memberIds = (activeMembers ?? []).map((m) => m.id);

  if (memberIds.length > 0) {
    const [{ data: recentAttendance14 }, { data: recentAttendance30 }, { data: recentThreshold }] =
      await Promise.all([
        admin
          .from('attendance')
          .select('member_id')
          .eq('gym_id', gymId)
          .gte('checked_in_at', fourteenDaysAgo.toISOString()),
        admin
          .from('attendance')
          .select('member_id')
          .eq('gym_id', gymId)
          .gte('checked_in_at', thirtyDaysAgo.toISOString()),
        admin
          .from('attendance')
          .select('member_id')
          .eq('gym_id', gymId)
          .gte('checked_in_at', thresholdAgo.toISOString()),
      ]);

    const checkedIn14 = new Set((recentAttendance14 ?? []).map((a) => a.member_id));
    const checkedIn30 = new Set((recentAttendance30 ?? []).map((a) => a.member_id));
    const checkedInThreshold = new Set((recentThreshold ?? []).map((a) => a.member_id));
    inactiveMembers14d = memberIds.filter((id) => !checkedIn14.has(id)).length;
    inactiveMembers30d = memberIds.filter((id) => !checkedIn30.has(id)).length;
    inactiveByThreshold = memberIds.filter((id) => !checkedInThreshold.has(id)).length;
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

  const [{ count: aiOpen }, { count: aiEscalated }, { count: convertedLeads }] = await Promise.all([
    admin
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .in('status', ['open', 'escalated']),
    admin
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'escalated'),
    admin
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'converted')
      .gte('updated_at', weekStart),
  ]);

  const leadConversionRate7d =
    (newLeads7d ?? 0) > 0
      ? Math.round(((convertedLeads ?? 0) / (newLeads7d ?? 1)) * 1000) / 10
      : 0;

  const { getRevenueMetrics } = await import('@/services/revenue');
  const revenue = await getRevenueMetrics(gymId);

  const weekAgoDate = new Date();
  weekAgoDate.setDate(weekAgoDate.getDate() - 7);
  const weekAgoStr = weekAgoDate.toISOString().split('T')[0];
  const { data: weekAgoSnapshot } = await admin
    .from('business_snapshots')
    .select('metrics')
    .eq('gym_id', gymId)
    .eq('snapshot_date', weekAgoStr)
    .maybeSingle();

  const priorMrr = (weekAgoSnapshot?.metrics as { mrrCents?: number } | null)?.mrrCents;
  const mrrChangePercent =
    priorMrr != null && priorMrr > 0
      ? Math.round(((revenue.mrrCents - priorMrr) / priorMrr) * 1000) / 10
      : null;

  let atRiskChurnCount = 0;
  if (memberIds.length > 0 && inactiveMembers14d > 0) {
    const { data: subs } = await admin
      .from('subscriptions')
      .select('member_id')
      .eq('gym_id', gymId)
      .in('status', ['active', 'trialing'])
      .in('member_id', memberIds);
    const subMembers = new Set((subs ?? []).map((s) => s.member_id));
    const { data: recent14 } = await admin
      .from('attendance')
      .select('member_id')
      .eq('gym_id', gymId)
      .gte('checked_in_at', fourteenDaysAgo.toISOString());
    const checkedIn14 = new Set((recent14 ?? []).map((a) => a.member_id));
    atRiskChurnCount = memberIds.filter(
      (id) => subMembers.has(id) && !checkedIn14.has(id)
    ).length;
  }

  const peakHours = new Array<number>(24).fill(0);
  const { data: attendanceHours } = await admin
    .from('attendance')
    .select('checked_in_at')
    .eq('gym_id', gymId)
    .gte('checked_in_at', thirtyDaysAgo.toISOString());

  for (const row of attendanceHours ?? []) {
    const hour = new Date(row.checked_in_at).getUTCHours();
    peakHours[hour] = (peakHours[hour] ?? 0) + 1;
  }

  const { countMissedCalls } = await import('@/services/ai-voice');
  const missedCalls7d = await countMissedCalls(gymId, sevenDaysAgo);

  return {
    newLeads7d: newLeads7d ?? 0,
    newLeads24h: newLeads24h ?? 0,
    leadsNotContacted48h: leadsNotContacted48h ?? 0,
    trialsScheduledToday: trialsScheduledToday ?? 0,
    newMembersThisWeek: newMembersThisWeek ?? 0,
    upcomingRenewals7d: upcomingRenewals7d ?? 0,
    cancelledClassesThisWeek: cancelledClassesThisWeek ?? 0,
    pastDueMembers: pastDueMembers ?? 0,
    inactiveMembers14d,
    inactiveMembers30d,
    inactiveByThreshold,
    inactiveThresholdDays,
    failedPayments: failedPayments ?? 0,
    readyForPromotion,
    lowAttendanceClasses,
    waiverGapMembers: waiverGaps.length,
    trialLeadsOpen: trialLeadsOpen ?? 0,
    aiConversationsNeedingFollowUp: aiOpen ?? 0,
    escalationQueueSize: aiEscalated ?? 0,
    leadConversionRate7d,
    mrrCents: revenue.mrrCents,
    mrrChangePercent,
    atRiskChurnCount,
    peakHours,
    beltCeremonyCandidates: readyForPromotion,
    missedCalls7d,
  };
}

export function metricsToRecommendations(metrics: BusinessMetrics): BusinessRecommendation[] {
  const recs: BusinessRecommendation[] = [];
  const push = (rec: Omit<BusinessRecommendation, 'actionKey'>) => {
    recs.push({ ...rec, actionKey: recommendationActionKey(rec.title) });
  };

  if (metrics.pastDueMembers > 0) {
    push({
      priority: 'P1',
      title: `${metrics.pastDueMembers} member(s) past due`,
      description: 'Reach out or send payment update links to recover revenue.',
      actionHref: '/subscriptions',
    });
  }

  if (metrics.inactiveByThreshold > 0) {
    push({
      priority: 'P1',
      title: `${metrics.inactiveByThreshold} inactive member(s)`,
      description: `No check-in in ${metrics.inactiveThresholdDays}+ days. Consider a win-back email or call.`,
      actionHref: '/members',
      draftEmail: `Hi there — we noticed you haven't been in lately. We'd love to see you back on the mats! Reply if you'd like help picking a class time.`,
    });
  } else if (metrics.inactiveMembers14d > 0) {
    push({
      priority: 'P1',
      title: `${metrics.inactiveMembers14d} inactive member(s)`,
      description: 'No check-in in 14+ days. Consider a win-back email or call.',
      actionHref: '/members',
      draftEmail: `Hi there — we noticed you haven't been in lately. We'd love to see you back on the mats!`,
    });
  }

  if (metrics.leadsNotContacted48h > 0) {
    push({
      priority: 'P1',
      title: `${metrics.leadsNotContacted48h} lead(s) not contacted in 48h+`,
      description: 'New leads waiting for first outreach.',
      actionHref: '/leads',
    });
  }

  if (metrics.escalationQueueSize > 0) {
    push({
      priority: 'P1',
      title: `${metrics.escalationQueueSize} escalated AI chat(s)`,
      description: 'Visitors requested staff follow-up via AI chat.',
      actionHref: '/ai-desk',
    });
  }

  if (metrics.missedCalls7d > 0) {
    push({
      priority: 'P2',
      title: `${metrics.missedCalls7d} missed call(s) this week`,
      description: 'Review voicemails and return calls from AI phone line.',
      actionHref: '/ai-desk',
    });
  }

  if (metrics.inactiveMembers30d > metrics.inactiveMembers14d) {
    push({
      priority: 'P2',
      title: `${metrics.inactiveMembers30d} inactive 30+ days`,
      description: 'Long-term absent members may need a win-back campaign.',
      actionHref: '/members',
    });
  }

  if (metrics.atRiskChurnCount > 0) {
    push({
      priority: 'P2',
      title: `${metrics.atRiskChurnCount} at-risk member(s)`,
      description: 'Active subscriptions with no check-in in 14+ days.',
      actionHref: '/members',
    });
  }

  if (metrics.upcomingRenewals7d > 0) {
    push({
      priority: 'P2',
      title: `${metrics.upcomingRenewals7d} renewal(s) this week`,
      description: 'Subscriptions renewing in the next 7 days.',
      actionHref: '/subscriptions',
    });
  }

  if (metrics.mrrChangePercent != null && metrics.mrrChangePercent <= -5) {
    push({
      priority: 'P2',
      title: `MRR down ${Math.abs(metrics.mrrChangePercent)}% vs last week`,
      description: 'Review cancellations and past-due accounts.',
      actionHref: '/subscriptions',
    });
  }

  if (metrics.trialsScheduledToday > 0) {
    push({
      priority: 'P2',
      title: `${metrics.trialsScheduledToday} trial(s) scheduled today`,
      description: 'Confirm attendance and prepare welcome materials.',
      actionHref: '/leads',
    });
  }

  if (metrics.newLeads7d > 0 && metrics.leadConversionRate7d < 10) {
    push({
      priority: 'P2',
      title: `Lead conversion ${metrics.leadConversionRate7d}% (7d)`,
      description: 'Follow up on open leads to improve trial-to-member conversion.',
      actionHref: '/leads',
    });
  }

  if (metrics.aiConversationsNeedingFollowUp > 0 && metrics.escalationQueueSize === 0) {
    push({
      priority: 'P3',
      title: `${metrics.aiConversationsNeedingFollowUp} open AI chat(s)`,
      description: 'Review open web chat conversations in AI Desk.',
      actionHref: '/ai-desk',
    });
  }

  if (metrics.newMembersThisWeek > 0) {
    push({
      priority: 'P3',
      title: `${metrics.newMembersThisWeek} new member(s) this week`,
      description: 'Send a welcome message and verify waivers.',
      actionHref: '/members',
    });
  }

  if (metrics.cancelledClassesThisWeek > 0) {
    push({
      priority: 'P3',
      title: `${metrics.cancelledClassesThisWeek} class cancellation(s) this week`,
      description: 'Review schedule exceptions and notify affected members.',
      actionHref: '/classes',
    });
  }

  if (metrics.newLeads7d > 0) {
    push({
      priority: 'P2',
      title: `${metrics.newLeads7d} new lead(s) this week`,
      description: 'Follow up while interest is high.',
      actionHref: '/leads',
    });
  }

  if (metrics.readyForPromotion > 0) {
    push({
      priority: 'P2',
      title: `${metrics.readyForPromotion} member(s) may be ready for promotion`,
      description: '8+ check-ins in 14 days with no recent promotion.',
      actionHref: '/belts',
    });
  }

  if (metrics.beltCeremonyCandidates > 0 && metrics.beltCeremonyCandidates !== metrics.readyForPromotion) {
    push({
      priority: 'P3',
      title: `${metrics.beltCeremonyCandidates} belt ceremony candidate(s)`,
      description: 'Plan your next promotion ceremony.',
      actionHref: '/belts',
    });
  }

  if (metrics.waiverGapMembers > 0) {
    push({
      priority: 'P2',
      title: `${metrics.waiverGapMembers} member(s) missing waivers`,
      description: 'Send waiver links or review compliance before check-in blocks.',
      actionHref: '/waivers',
    });
  }

  if (metrics.lowAttendanceClasses > 0) {
    push({
      priority: 'P3',
      title: `${metrics.lowAttendanceClasses} class(es) with low attendance`,
      description: lowAttendanceDescription(),
      actionHref: '/classes',
    });
  }

  if (metrics.trialLeadsOpen > 0) {
    push({
      priority: 'P3',
      title: `${metrics.trialLeadsOpen} open trial lead(s)`,
      description: 'Confirm trials and follow up while interest is fresh.',
      actionHref: '/leads',
    });
  }

  return recs;
}

export function filterDigestRecommendations(
  recommendations: BusinessRecommendation[],
  sections: DigestSections,
  hiddenKeys: Set<string>
): BusinessRecommendation[] {
  return recommendations.filter((rec) => {
    if (hiddenKeys.has(rec.actionKey)) return false;
    const section = recommendationSection(rec.title);
    return sections[section] !== false;
  });
}

export async function getHiddenDigestActionKeys(gymId: string): Promise<Set<string>> {
  const admin = getAdminClient();
  const today = new Date().toISOString().split('T')[0];
  const { data } = await admin
    .from('digest_action_states')
    .select('action_key, status, snooze_until')
    .eq('gym_id', gymId);

  const hidden = new Set<string>();
  for (const row of data ?? []) {
    if (row.status === 'done') {
      hidden.add(row.action_key);
    } else if (row.status === 'snoozed' && row.snooze_until && row.snooze_until > today) {
      hidden.add(row.action_key);
    }
  }
  return hidden;
}

export async function markDigestActionDone(gymId: string, actionKey: string): Promise<void> {
  const admin = getAdminClient();
  await admin.from('digest_action_states').upsert(
    {
      gym_id: gymId,
      action_key: actionKey,
      status: 'done',
      snooze_until: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'gym_id,action_key' }
  );
}

export async function snoozeDigestAction(
  gymId: string,
  actionKey: string,
  days = 3
): Promise<void> {
  const admin = getAdminClient();
  const until = new Date();
  until.setDate(until.getDate() + days);
  await admin.from('digest_action_states').upsert(
    {
      gym_id: gymId,
      action_key: actionKey,
      status: 'snoozed',
      snooze_until: until.toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'gym_id,action_key' }
  );
}

export async function getDigestRecipients(gymId: string, ownerId: string): Promise<string[]> {
  const admin = getAdminClient();
  const emails = new Set<string>();

  try {
    const { data: owner } = await admin.auth.admin.getUserById(ownerId);
    if (owner?.user?.email) emails.add(owner.user.email);
  } catch {
    // best-effort
  }

  const { data: admins } = await admin
    .from('staff_roles')
    .select('user_id')
    .eq('gym_id', gymId)
    .in('role', ['owner', 'admin']);

  for (const row of admins ?? []) {
    try {
      const { data: user } = await admin.auth.admin.getUserById(row.user_id);
      if (user?.user?.email) emails.add(user.user.email);
    } catch {
      // skip
    }
  }

  return [...emails];
}

export async function backfillSnapshots(gymId: string, days = 14): Promise<number> {
  const admin = getAdminClient();
  const metrics = await computeGymMetrics(gymId);
  const { data: gymRow } = await admin
    .from('gyms')
    .select('digest_sections')
    .eq('id', gymId)
    .maybeSingle();
  const sections = parseDigestSections(gymRow?.digest_sections);
  const hidden = await getHiddenDigestActionKeys(gymId);
  const recommendations = filterDigestRecommendations(
    metricsToRecommendations(metrics),
    sections,
    hidden
  );

  let count = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const { data: existing } = await admin
      .from('business_snapshots')
      .select('id')
      .eq('gym_id', gymId)
      .eq('snapshot_date', dateStr)
      .maybeSingle();
    if (existing) continue;

    await admin.from('business_snapshots').upsert(
      {
        gym_id: gymId,
        snapshot_date: dateStr,
        metrics,
        recommendations,
      },
      { onConflict: 'gym_id,snapshot_date' }
    );
    count++;
  }
  return count;
}

export function getMarketingTip(metrics: BusinessMetrics): string {
  return marketingTipForMetrics(metrics);
}

export function buildDigestSmsBody(
  gymName: string,
  recommendations: BusinessRecommendation[]
): string {
  const top = recommendations.slice(0, 3).map((r) => r.title).join('; ');
  return `${gymName} actions: ${top || 'All clear today'}. Full digest in email.`;
}

export async function getDigestSmsPhone(gymId: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('gyms')
    .select('digest_sms_enabled, digest_sms_phone, contact_phone')
    .eq('id', gymId)
    .maybeSingle();

  if (!data?.digest_sms_enabled) return null;
  return data.digest_sms_phone?.trim() || data.contact_phone?.trim() || null;
}

export async function saveDailySnapshot(gymId: string): Promise<void> {
  const admin = getAdminClient();
  const metrics = await computeGymMetrics(gymId);
  const allRecs = metricsToRecommendations(metrics);
  const { data: gymRow } = await admin
    .from('gyms')
    .select('digest_sections')
    .eq('id', gymId)
    .maybeSingle();
  const sections = parseDigestSections(gymRow?.digest_sections);
  const hidden = await getHiddenDigestActionKeys(gymId);
  const recommendations = filterDigestRecommendations(allRecs, sections, hidden);
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

  if (data) {
    const metrics = data.metrics as BusinessMetrics;
    return {
      ...data,
      marketingTip: getMarketingTip(metrics),
    };
  }

  const metrics = await computeGymMetrics(gymId);
  const { data: gymRow } = await admin
    .from('gyms')
    .select('digest_sections')
    .eq('id', gymId)
    .maybeSingle();
  const sections = parseDigestSections(gymRow?.digest_sections);
  const hidden = await getHiddenDigestActionKeys(gymId);
  const recommendations = filterDigestRecommendations(
    metricsToRecommendations(metrics),
    sections,
    hidden
  );
  return {
    metrics,
    recommendations,
    marketingTip: getMarketingTip(metrics),
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

export type BenchmarkComparison = {
  metricKey: string;
  gymValue: number;
  platformMedian: number;
  percentile: 'below' | 'at' | 'above';
};

export async function compareGymToBenchmarks(gymId: string): Promise<BenchmarkComparison[]> {
  const admin = getAdminClient();
  const metrics = await computeGymMetrics(gymId);
  const { data: benchmarks } = await admin.from('platform_benchmarks').select('*');

  const comparisons: BenchmarkComparison[] = [];

  for (const b of benchmarks ?? []) {
    if (b.metric_key === 'lead_conversion_rate_7d') {
      const median = Number(b.p50 ?? 15);
      comparisons.push({
        metricKey: b.metric_key,
        gymValue: metrics.leadConversionRate7d,
        platformMedian: median,
        percentile:
          metrics.leadConversionRate7d >= Number(b.p75 ?? 25)
            ? 'above'
            : metrics.leadConversionRate7d <= Number(b.p25 ?? 8)
              ? 'below'
              : 'at',
      });
    }
  }

  return comparisons;
}

export async function sendVoiceBriefing(gymId: string): Promise<boolean> {
  const admin = getAdminClient();
  const { data: gym } = await admin
    .from('gyms')
    .select('name, voice_briefing_enabled, voice_briefing_phone, twilio_phone')
    .eq('id', gymId)
    .maybeSingle();

  if (!gym?.voice_briefing_enabled || !gym.voice_briefing_phone) return false;

  const metrics = await computeGymMetrics(gymId);
  const lines = metricsToRecommendations(metrics).slice(0, 3).map((r) => r.title);
  const script =
    lines.length > 0
      ? `Good morning from ${gym.name}. Today's priorities: ${lines.join('. ')}.`
      : `Good morning from ${gym.name}. No urgent actions today.`;

  const { sendSms } = await import('@/lib/sms/twilio');
  await sendSms({
    to: gym.voice_briefing_phone,
    from: gym.twilio_phone ?? undefined,
    body: `[Voice briefing] ${script}`,
  });

  return true;
}

import { describe, expect, it } from 'vitest';
import {
  metricsToRecommendations,
  recommendationActionKey,
  type BusinessMetrics,
} from '@/services/business-assistant';

const baseMetrics = (): BusinessMetrics => ({
  newLeads7d: 0,
  newLeads24h: 0,
  leadsNotContacted48h: 0,
  trialsScheduledToday: 0,
  newMembersThisWeek: 0,
  upcomingRenewals7d: 0,
  cancelledClassesThisWeek: 0,
  pastDueMembers: 0,
  inactiveMembers14d: 0,
  inactiveMembers30d: 0,
  inactiveByThreshold: 0,
  inactiveThresholdDays: 14,
  failedPayments: 0,
  readyForPromotion: 0,
  lowAttendanceClasses: 0,
  waiverGapMembers: 0,
  trialLeadsOpen: 0,
  aiConversationsNeedingFollowUp: 0,
  escalationQueueSize: 0,
  leadConversionRate7d: 0,
  mrrCents: 0,
  mrrChangePercent: null,
  atRiskChurnCount: 0,
  peakHours: new Array(24).fill(0),
  beltCeremonyCandidates: 0,
});

describe('metricsToRecommendations', () => {
  it('prioritizes past due and stale leads', () => {
    const metrics: BusinessMetrics = {
      ...baseMetrics(),
      newLeads7d: 2,
      newLeads24h: 1,
      leadsNotContacted48h: 3,
      pastDueMembers: 1,
      inactiveMembers14d: 4,
      inactiveMembers30d: 6,
      inactiveByThreshold: 4,
    };

    const recs = metricsToRecommendations(metrics);
    expect(recs[0]?.priority).toBe('P1');
    expect(recs.some((r) => r.title.includes('past due'))).toBe(true);
    expect(recs.some((r) => r.title.includes('48h'))).toBe(true);
    expect(recs.every((r) => r.actionKey)).toBe(true);
  });

  it('includes escalation and draft email for inactive members', () => {
    const recs = metricsToRecommendations({
      ...baseMetrics(),
      inactiveByThreshold: 2,
      inactiveThresholdDays: 21,
    });
    expect(recs.some((r) => r.draftEmail?.includes('haven'))).toBe(true);
  });

  it('returns empty when all metrics are zero', () => {
    expect(metricsToRecommendations(baseMetrics())).toEqual([]);
  });
});

describe('recommendationActionKey', () => {
  it('slugifies titles', () => {
    expect(recommendationActionKey('3 member(s) past due')).toBe('3-member-s-past-due');
  });
});

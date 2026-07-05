import { describe, expect, it } from 'vitest';
import {
  metricsToRecommendations,
  type BusinessMetrics,
} from '@/services/business-assistant';

describe('metricsToRecommendations', () => {
  it('prioritizes past due and stale leads', () => {
    const metrics: BusinessMetrics = {
      newLeads7d: 2,
      newLeads24h: 1,
      leadsNotContacted48h: 3,
      pastDueMembers: 1,
      inactiveMembers14d: 4,
      inactiveMembers30d: 6,
      failedPayments: 0,
      readyForPromotion: 0,
      lowAttendanceClasses: 0,
      waiverGapMembers: 0,
      trialLeadsOpen: 0,
    };

    const recs = metricsToRecommendations(metrics);
    expect(recs[0]?.priority).toBe('P1');
    expect(recs.some((r) => r.title.includes('past due'))).toBe(true);
    expect(recs.some((r) => r.title.includes('48h'))).toBe(true);
  });

  it('returns empty when all metrics are zero', () => {
    const metrics: BusinessMetrics = {
      newLeads7d: 0,
      newLeads24h: 0,
      leadsNotContacted48h: 0,
      pastDueMembers: 0,
      inactiveMembers14d: 0,
      inactiveMembers30d: 0,
      failedPayments: 0,
      readyForPromotion: 0,
      lowAttendanceClasses: 0,
      waiverGapMembers: 0,
      trialLeadsOpen: 0,
    };

    expect(metricsToRecommendations(metrics)).toEqual([]);
  });
});

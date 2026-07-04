import { describe, expect, it } from 'vitest';
import { computeCampaignRoas, summarizeCampaignRoas } from '@/lib/campaign-roas';

describe('campaign-roas', () => {
  it('computes open and click rates without ad spend', () => {
    const metrics = computeCampaignRoas({
      sent_count: 100,
      open_count: 40,
      click_count: 10,
      ad_spend_cents: 0,
    });
    expect(metrics.openRate).toBe(0.4);
    expect(metrics.clickRate).toBe(0.1);
    expect(metrics.costPerClick).toBeNull();
    expect(metrics.clicksPerDollar).toBeNull();
  });

  it('computes cost per click and clicks per dollar when spend is set', () => {
    const metrics = computeCampaignRoas({
      sent_count: 50,
      open_count: 20,
      click_count: 5,
      ad_spend_cents: 2500,
    });
    expect(metrics.costPerClick).toBe(5);
    expect(metrics.clicksPerDollar).toBe(0.2);
  });

  it('summarizes aggregate campaign performance', () => {
    const summary = summarizeCampaignRoas([
      { sent_count: 100, open_count: 30, click_count: 10, ad_spend_cents: 5000 },
      { sent_count: 50, open_count: 10, click_count: 5, ad_spend_cents: 2500 },
    ]);
    expect(summary.totalSent).toBe(150);
    expect(summary.totalOpens).toBe(40);
    expect(summary.totalClicks).toBe(15);
    expect(summary.totalAdSpendCents).toBe(7500);
    expect(summary.aggregateClicksPerDollar).toBeCloseTo(0.2);
  });
});

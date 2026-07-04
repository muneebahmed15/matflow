export type CampaignRoasInput = {
  sent_count: number;
  open_count: number;
  click_count: number;
  ad_spend_cents: number;
};

export type CampaignRoasMetrics = {
  openRate: number;
  clickRate: number;
  costPerClick: number | null;
  clicksPerDollar: number | null;
};

export function computeCampaignRoas(campaign: CampaignRoasInput): CampaignRoasMetrics {
  const sent = campaign.sent_count || 0;
  const openRate = sent > 0 ? campaign.open_count / sent : 0;
  const clickRate = sent > 0 ? campaign.click_count / sent : 0;
  const spendDollars = campaign.ad_spend_cents / 100;

  if (spendDollars <= 0) {
    return { openRate, clickRate, costPerClick: null, clicksPerDollar: null };
  }

  return {
    openRate,
    clickRate,
    costPerClick: campaign.click_count > 0 ? spendDollars / campaign.click_count : null,
    clicksPerDollar: campaign.click_count / spendDollars,
  };
}

export type CampaignRoasSummary = {
  totalSent: number;
  totalOpens: number;
  totalClicks: number;
  totalAdSpendCents: number;
  avgOpenRate: number;
  avgClickRate: number;
  aggregateClicksPerDollar: number | null;
};

export function summarizeCampaignRoas(
  campaigns: CampaignRoasInput[]
): CampaignRoasSummary {
  const sentCampaigns = campaigns.filter((c) => c.sent_count > 0);
  const totalSent = sentCampaigns.reduce((sum, c) => sum + c.sent_count, 0);
  const totalOpens = sentCampaigns.reduce((sum, c) => sum + c.open_count, 0);
  const totalClicks = sentCampaigns.reduce((sum, c) => sum + c.click_count, 0);
  const totalAdSpendCents = sentCampaigns.reduce((sum, c) => sum + (c.ad_spend_cents ?? 0), 0);
  const spendDollars = totalAdSpendCents / 100;

  return {
    totalSent,
    totalOpens,
    totalClicks,
    totalAdSpendCents,
    avgOpenRate: totalSent > 0 ? totalOpens / totalSent : 0,
    avgClickRate: totalSent > 0 ? totalClicks / totalSent : 0,
    aggregateClicksPerDollar: spendDollars > 0 ? totalClicks / spendDollars : null,
  };
}

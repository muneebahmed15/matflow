import { describe, expect, it } from 'vitest';
import {
  campaignClickUrl,
  campaignOpenUrl,
  campaignTrackingToken,
  prepareCampaignHtml,
  safeRedirectUrl,
  verifyCampaignTrackingToken,
} from '@/lib/campaign-tracking';

describe('campaign tracking tokens', () => {
  it('verifies a valid token', () => {
    const token = campaignTrackingToken('gym-1', 'camp-1', 'a@x.com');
    expect(verifyCampaignTrackingToken('gym-1', 'camp-1', 'a@x.com', token)).toBe(true);
  });

  it('rejects tampered tokens', () => {
    const token = campaignTrackingToken('gym-1', 'camp-1', 'a@x.com');
    expect(verifyCampaignTrackingToken('gym-1', 'camp-2', 'a@x.com', token)).toBe(false);
    expect(verifyCampaignTrackingToken('gym-2', 'camp-1', 'a@x.com', token)).toBe(false);
    expect(verifyCampaignTrackingToken('gym-1', 'camp-1', 'b@x.com', token)).toBe(false);
  });
});

describe('prepareCampaignHtml', () => {
  it('rewrites links and injects an open pixel', () => {
    const html = prepareCampaignHtml({
      html: '<html><body><a href="https://example.com/trial">Book</a></body></html>',
      appUrl: 'https://app.example.com',
      gymId: 'gym-1',
      campaignId: 'camp-1',
      email: 'a@x.com',
    });

    expect(html).toContain('/api/public/campaign/open?');
    expect(html).toContain('/api/public/campaign/click?');
    expect(html).toContain(encodeURIComponent('https://example.com/trial'));
  });

  it('skips mailto and unsubscribe links', () => {
    const html = prepareCampaignHtml({
      html: '<a href="mailto:hi@x.com">Email</a><a href="https://app.example.com/api/public/unsubscribe?gym=1">Unsub</a>',
      appUrl: 'https://app.example.com',
      gymId: 'gym-1',
      campaignId: 'camp-1',
      email: 'a@x.com',
    });

    expect(html).toContain('href="mailto:hi@x.com"');
    expect(html).not.toContain('campaign/click?');
  });
});

describe('tracking urls', () => {
  it('builds open and click urls with tokens', () => {
    const open = campaignOpenUrl('https://app.example.com', 'gym-1', 'camp-1', 'a@x.com');
    const click = campaignClickUrl(
      'https://app.example.com',
      'gym-1',
      'camp-1',
      'a@x.com',
      'https://example.com'
    );
    expect(open).toContain('/api/public/campaign/open?');
    expect(click).toContain('/api/public/campaign/click?');
    expect(click).toContain(encodeURIComponent('https://example.com'));
  });
});

describe('safeRedirectUrl', () => {
  it('allows http and https only', () => {
    expect(safeRedirectUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(safeRedirectUrl('javascript:alert(1)')).toBeNull();
    expect(safeRedirectUrl('not-a-url')).toBeNull();
  });
});

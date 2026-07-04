import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  const dedicated = process.env.CAMPAIGN_TRACKING_SECRET;
  if (dedicated) return dedicated;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CAMPAIGN_TRACKING_SECRET is required in production');
  }
  return process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-campaign-tracking-secret';
}

export function campaignTrackingToken(gymId: string, campaignId: string, email: string): string {
  return createHmac('sha256', secret())
    .update(`${gymId}:${campaignId}:${email.toLowerCase().trim()}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyCampaignTrackingToken(
  gymId: string,
  campaignId: string,
  email: string,
  token: string
): boolean {
  const expected = campaignTrackingToken(gymId, campaignId, email);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function campaignOpenUrl(appUrl: string, gymId: string, campaignId: string, email: string): string {
  const params = new URLSearchParams({
    gym: gymId,
    c: campaignId,
    email,
    token: campaignTrackingToken(gymId, campaignId, email),
  });
  return `${appUrl}/api/public/campaign/open?${params.toString()}`;
}

export function campaignClickUrl(
  appUrl: string,
  gymId: string,
  campaignId: string,
  email: string,
  targetUrl: string
): string {
  const params = new URLSearchParams({
    gym: gymId,
    c: campaignId,
    email,
    token: campaignTrackingToken(gymId, campaignId, email),
    u: targetUrl,
  });
  return `${appUrl}/api/public/campaign/click?${params.toString()}`;
}

function shouldSkipLink(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('#')) return true;
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return true;
  if (trimmed.includes('/api/public/unsubscribe')) return true;
  if (trimmed.includes('/api/public/campaign/click')) return true;
  return false;
}

export function safeRedirectUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Inject open pixel and rewrite external links for campaign analytics. */
export function prepareCampaignHtml(input: {
  html: string;
  appUrl: string;
  gymId: string;
  campaignId: string;
  email: string;
}): string {
  const { html, appUrl, gymId, campaignId, email } = input;
  const withLinks = html.replace(/href="([^"]+)"/gi, (match, url: string) => {
    if (shouldSkipLink(url)) return match;
    const safe = safeRedirectUrl(url);
    if (!safe) return match;
    const tracked = campaignClickUrl(appUrl, gymId, campaignId, email, safe);
    return `href="${tracked}"`;
  });

  const pixel = `<img src="${campaignOpenUrl(appUrl, gymId, campaignId, email)}" width="1" height="1" alt="" style="display:none" />`;
  if (withLinks.includes('</body>')) {
    return withLinks.replace('</body>', `${pixel}</body>`);
  }
  return `${withLinks}${pixel}`;
}

/** 1x1 transparent GIF for open tracking responses. */
export const TRACKING_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

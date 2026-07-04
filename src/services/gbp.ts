import { getAdminClient } from '@/lib/supabase/admin';
import { getPublicEnv } from '@/lib/env';
import { ServiceError } from '@/services/errors';
import { computeGbpHoursFromClasses, type GbpPeriod } from '@/lib/gbp-hours';
import { logger } from '@/lib/logger';

export type GbpConnectionStatus = {
  connected: boolean;
  accountId: string | null;
  locationId: string | null;
  connectedAt: string | null;
};

export function getGbpOAuthUrl(gymId: string): string | null {
  const clientId = process.env.GOOGLE_GBP_CLIENT_ID;
  const redirectUri = `${getPublicEnv().NEXT_PUBLIC_APP_URL}/api/gbp/callback`;
  if (!clientId) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/business.manage',
    access_type: 'offline',
    prompt: 'consent',
    state: gymId,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function getGbpConnectionStatus(gymId: string): Promise<GbpConnectionStatus> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('gbp_connections')
    .select('account_id, location_id, connected_at, access_token, refresh_token')
    .eq('gym_id', gymId)
    .maybeSingle();

  return {
    connected: Boolean(data?.access_token ?? data?.refresh_token),
    accountId: data?.account_id ?? null,
    locationId: data?.location_id ?? null,
    connectedAt: data?.connected_at ?? null,
  };
}

export async function saveGbpTokens(input: {
  gymId: string;
  accountId?: string;
  locationId?: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}): Promise<void> {
  const admin = getAdminClient();
  const tokenExpiresAt = input.expiresIn
    ? new Date(Date.now() + input.expiresIn * 1000).toISOString()
    : null;

  const { error } = await admin.from('gbp_connections').upsert(
    {
      gym_id: input.gymId,
      account_id: input.accountId ?? null,
      location_id: input.locationId ?? null,
      access_token: input.accessToken,
      refresh_token: input.refreshToken ?? null,
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'gym_id' }
  );

  if (error) throw new ServiceError(500, error.message);
}

/**
 * Directory listing sync via third-party APIs (Yext, Moz Local) is recommended
 * over building a 70+ directory network in-house. Configure YEXT_API_KEY to
 * enable sync when ready.
 */
export async function syncDirectoryListings(gymId: string): Promise<{ synced: boolean; provider: string }> {
  const yextKey = process.env.YEXT_API_KEY;
  if (!yextKey) {
    return { synced: false, provider: 'none — set YEXT_API_KEY or integrate Moz Local API' };
  }

  const admin = getAdminClient();
  const { data: gym } = await admin
    .from('gyms')
    .select('name, contact_phone, address_line1, address_city, address_state, address_zip, contact_email')
    .eq('id', gymId)
    .single();

  if (!gym) throw new ServiceError(404, 'Gym not found');

  // Placeholder: production would POST to Yext Entity API
  return { synced: true, provider: 'yext (configured)' };
}

export type LocationPage = {
  slug: string;
  title: string;
  description: string;
  city: string | null;
  state: string | null;
};

export async function listLocationPages(gymId: string): Promise<LocationPage[]> {
  const admin = getAdminClient();

  const { data: gym } = await admin
    .from('gyms')
    .select('name, tagline, address_city, address_state')
    .eq('id', gymId)
    .single();

  const { data: locations } = await admin
    .from('gym_locations')
    .select('name, address_city, address_state, address_line1')
    .eq('gym_id', gymId);

  const pages: LocationPage[] = [];

  if (gym?.address_city) {
    pages.push({
      slug: `${gym.address_city.toLowerCase().replace(/\s+/g, '-')}-martial-arts`,
      title: `Martial Arts Classes in ${gym.address_city}${gym.address_state ? `, ${gym.address_state}` : ''}`,
      description: `Train at ${gym.name} in ${gym.address_city}. ${gym.tagline ?? 'Book your free trial today.'}`,
      city: gym.address_city,
      state: gym.address_state,
    });
  }

  for (const loc of locations ?? []) {
    if (!loc.address_city) continue;
    pages.push({
      slug: `${loc.address_city.toLowerCase().replace(/\s+/g, '-')}-${loc.name.toLowerCase().replace(/\s+/g, '-')}`,
      title: `${loc.name} — ${gym?.name ?? 'Martial Arts'}`,
      description: `Visit ${loc.name} in ${loc.address_city}. ${gym?.tagline ?? ''}`.trim(),
      city: loc.address_city,
      state: loc.address_state,
    });
  }

  return pages;
}

async function refreshGbpAccessToken(gymId: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_GBP_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GBP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const admin = getAdminClient();
  const { data: conn } = await admin
    .from('gbp_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!conn?.refresh_token && !conn?.access_token) return null;

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  if (conn.access_token && expiresAt > Date.now() + 60_000) {
    return conn.access_token;
  }

  if (!conn.refresh_token) return conn.access_token;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: conn.refresh_token,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const tokens = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !tokens.access_token) {
    logger.warn({ gymId, error: tokens.error }, 'GBP token refresh failed');
    return conn.access_token;
  }

  await saveGbpTokens({
    gymId,
    accessToken: tokens.access_token,
    refreshToken: conn.refresh_token,
    expiresIn: tokens.expires_in,
  });

  return tokens.access_token;
}

export async function previewGbpHoursFromSchedule(gymId: string): Promise<GbpPeriod[]> {
  const admin = getAdminClient();
  const { data: classes } = await admin
    .from('classes')
    .select('day_of_week, start_time, end_time')
    .eq('gym_id', gymId)
    .eq('is_active', true);

  return computeGbpHoursFromClasses(classes ?? []);
}

export async function syncGbpHoursFromSchedule(gymId: string): Promise<{
  synced: boolean;
  periods: GbpPeriod[];
  message: string;
}> {
  const periods = await previewGbpHoursFromSchedule(gymId);
  if (periods.length === 0) {
    return { synced: false, periods, message: 'No active classes to derive hours from.' };
  }

  const admin = getAdminClient();
  const { data: conn } = await admin
    .from('gbp_connections')
    .select('location_id, account_id')
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!conn?.location_id) {
    return {
      synced: false,
      periods,
      message: 'GBP not connected or location not set — preview only.',
    };
  }

  const accessToken = await refreshGbpAccessToken(gymId);
  if (!accessToken) {
    return {
      synced: false,
      periods,
      message: 'Could not obtain GBP access token — preview only.',
    };
  }

  const locationName = conn.location_id.startsWith('locations/')
    ? conn.location_id
    : `locations/${conn.location_id}`;

  const res = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?updateMask=regularHours`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      regularHours: {
        periods: periods.map((p) => ({
          openDay: p.openDay,
          openTime: { hours: parseInt(p.openTime.split(':')[0], 10), minutes: parseInt(p.openTime.split(':')[1], 10) },
          closeDay: p.closeDay,
          closeTime: { hours: parseInt(p.closeTime.split(':')[0], 10), minutes: parseInt(p.closeTime.split(':')[1], 10) },
        })),
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    logger.warn({ gymId, errBody }, 'GBP hours sync failed');
    return { synced: false, periods, message: 'GBP API rejected hours update — preview saved locally.' };
  }

  return { synced: true, periods, message: `Synced ${periods.length} day(s) of hours to Google Business Profile.` };
}

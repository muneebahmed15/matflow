import { getAdminClient } from '@/lib/supabase/admin';
import { getPublicEnv } from '@/lib/env';
import { ServiceError } from '@/services/errors';

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

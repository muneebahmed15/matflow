import {
  buildGoogleSheetsCsvExportUrl,
  parseGoogleSheetsUrl,
} from '@/lib/google-sheets-import';
import { getAdminClient } from '@/lib/supabase/admin';
import { getPublicEnv } from '@/lib/env';
import { ServiceError } from '@/services/errors';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

export function getGoogleSheetsOAuthUrl(gymId: string): string | null {
  const clientId = process.env.GOOGLE_SHEETS_CLIENT_ID ?? process.env.GOOGLE_GBP_CLIENT_ID;
  const redirectUri = `${getPublicEnv().NEXT_PUBLIC_APP_URL}/api/google-sheets/callback`;
  if (!clientId) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SHEETS_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: gymId,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function getGoogleSheetsConnectionStatus(gymId: string): Promise<{
  connected: boolean;
  oauthUrl: string | null;
}> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('google_sheets_connections')
    .select('access_token, refresh_token')
    .eq('gym_id', gymId)
    .maybeSingle();

  return {
    connected: Boolean(data?.access_token ?? data?.refresh_token),
    oauthUrl: getGoogleSheetsOAuthUrl(gymId),
  };
}

export async function saveGoogleSheetsTokens(input: {
  gymId: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}): Promise<void> {
  const admin = getAdminClient();
  const tokenExpiresAt = input.expiresIn
    ? new Date(Date.now() + input.expiresIn * 1000).toISOString()
    : null;

  const { error } = await admin.from('google_sheets_connections').upsert(
    {
      gym_id: input.gymId,
      access_token: input.accessToken,
      refresh_token: input.refreshToken ?? null,
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'gym_id' }
  );

  if (error) throw new ServiceError(500, error.message);
}

async function getValidAccessToken(gymId: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('google_sheets_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!data?.access_token && !data?.refresh_token) return null;

  const expiresSoon =
    data.token_expires_at &&
    new Date(data.token_expires_at).getTime() < Date.now() + 60_000;

  if (!expiresSoon && data.access_token) return data.access_token;

  const clientId = process.env.GOOGLE_SHEETS_CLIENT_ID ?? process.env.GOOGLE_GBP_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_SHEETS_CLIENT_SECRET ?? process.env.GOOGLE_GBP_CLIENT_SECRET;
  if (!clientSecret || !data.refresh_token) return data.access_token;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret,
      refresh_token: data.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!body.access_token) return data.access_token;

  await saveGoogleSheetsTokens({
    gymId,
    accessToken: body.access_token,
    refreshToken: data.refresh_token,
    expiresIn: body.expires_in,
  });

  return body.access_token;
}

export async function fetchGoogleSheetCsvAuthenticated(
  gymId: string,
  sheetUrl: string
): Promise<{ csvText: string; spreadsheetId: string }> {
  const token = await getValidAccessToken(gymId);
  if (!token) throw new ServiceError(401, 'Google Sheets not connected for this gym.');

  const ref = parseGoogleSheetsUrl(sheetUrl);
  const exportUrl = buildGoogleSheetsCsvExportUrl(ref);

  const response = await fetch(exportUrl, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new ServiceError(502, `Failed to fetch private sheet (HTTP ${response.status})`);
  }

  const csvText = (await response.text()).replace(/^\uFEFF/, '');
  if (!csvText.trim() || csvText.trimStart().startsWith('<!DOCTYPE')) {
    throw new ServiceError(400, 'Could not read sheet as CSV via OAuth.');
  }

  return { csvText, spreadsheetId: ref.spreadsheetId };
}

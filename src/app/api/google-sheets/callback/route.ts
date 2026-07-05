import { NextRequest, NextResponse } from 'next/server';
import { saveGoogleSheetsTokens } from '@/services/google-sheets-oauth';
import { getPublicEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const gymId = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');

  const migrationUrl = `${getPublicEnv().NEXT_PUBLIC_APP_URL}/migration`;

  if (error || !code || !gymId) {
    return NextResponse.redirect(`${migrationUrl}?sheets=error`);
  }

  const clientId = process.env.GOOGLE_SHEETS_CLIENT_ID ?? process.env.GOOGLE_GBP_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_SHEETS_CLIENT_SECRET ?? process.env.GOOGLE_GBP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${migrationUrl}?sheets=not_configured`);
  }

  const redirectUri = `${getPublicEnv().NEXT_PUBLIC_APP_URL}/api/google-sheets/callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (!tokens.access_token) {
      logger.warn({ tokens }, 'Google Sheets OAuth token exchange failed');
      return NextResponse.redirect(`${migrationUrl}?sheets=token_error`);
    }

    await saveGoogleSheetsTokens({
      gymId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });

    return NextResponse.redirect(`${migrationUrl}?sheets=connected`);
  } catch (err) {
    logger.error({ err }, 'Google Sheets OAuth callback failed');
    return NextResponse.redirect(`${migrationUrl}?sheets=error`);
  }
}

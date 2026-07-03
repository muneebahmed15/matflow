import { NextResponse } from 'next/server';

/** Returns null when authorized; otherwise an error response. */
export function requireCronSecret(authHeader: string | null): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  }
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

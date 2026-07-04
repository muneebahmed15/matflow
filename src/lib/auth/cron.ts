import { createHash, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

/**
 * Constant-time comparison of two strings. Both sides are hashed to a
 * fixed-length digest first so neither the timing nor the length of the
 * provided token leaks information about the configured secret.
 */
function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Guards `/api/cron/*` routes. Returns null when authorized; otherwise an
 * error response.
 *
 * Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET` when the
 * `CRON_SECRET` environment variable is set on the project, so no additional
 * wiring is required beyond defining the secret.
 */
export function requireCronSecret(authHeader: string | null): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  }
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token || !secretsMatch(token, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

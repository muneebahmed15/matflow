import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dev-unsubscribe-secret'
  );
}

export function unsubscribeToken(gymId: string, email: string): string {
  return createHmac('sha256', secret())
    .update(`${gymId}:${email.toLowerCase().trim()}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyUnsubscribeToken(gymId: string, email: string, token: string): boolean {
  const expected = unsubscribeToken(gymId, email);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function unsubscribeUrl(appUrl: string, gymId: string, email: string): string {
  const params = new URLSearchParams({
    gym: gymId,
    email,
    token: unsubscribeToken(gymId, email),
  });
  return `${appUrl}/api/public/unsubscribe?${params.toString()}`;
}

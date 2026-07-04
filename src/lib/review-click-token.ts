import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  const dedicated = process.env.REVIEW_CLICK_SECRET;
  if (dedicated) return dedicated;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('REVIEW_CLICK_SECRET is required in production');
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-review-click-secret';
}

export function reviewClickToken(gymId: string, memberId: string, requestId: string): string {
  return createHmac('sha256', secret())
    .update(`${gymId}:${memberId}:${requestId}`)
    .digest('hex');
}

export function verifyReviewClickToken(
  gymId: string,
  memberId: string,
  requestId: string,
  token: string
): boolean {
  const expected = reviewClickToken(gymId, memberId, requestId);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

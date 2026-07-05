import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  return (
    process.env.MEMBER_RANK_TOKEN_SECRET ||
    process.env.CONVERSATION_TOKEN_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dev-member-rank-token'
  );
}

export function signMemberRankToken(memberId: string, gymId: string): string {
  return createHmac('sha256', secret())
    .update(`rank:${memberId}:${gymId}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyMemberRankToken(memberId: string, gymId: string, token: string): boolean {
  const expected = signMemberRankToken(memberId, gymId);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  return (
    process.env.CONVERSATION_TOKEN_SECRET ||
    process.env.CRON_SECRET ||
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dev-conversation-token'
  );
}

export function signConversationToken(conversationId: string, gymId: string): string {
  return createHmac('sha256', secret())
    .update(`${conversationId}:${gymId}`)
    .digest('hex');
}

export function verifyConversationToken(
  conversationId: string,
  gymId: string,
  token: string
): boolean {
  const expected = signConversationToken(conversationId, gymId);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

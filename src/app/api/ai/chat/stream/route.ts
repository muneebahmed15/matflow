import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { streamWebChatMessage } from '@/services/ai-front-desk';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyConversationToken } from '@/lib/auth/conversation-token';

const messageSchema = z.object({
  conversation_id: z.string().uuid(),
  conversation_token: z.string().min(1),
  message: z.string().min(1).max(2000),
});

async function assertOpenConversation(conversationId: string, gymId: string) {
  const admin = getAdminClient();
  const { data: conversation } = await admin
    .from('ai_conversations')
    .select('id, gym_id, status')
    .eq('id', conversationId)
    .maybeSingle();

  return Boolean(conversation && conversation.gym_id === gymId && conversation.status === 'open');
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limit = await checkRateLimit(`ai-chat:${ip}`, 30, 60 * 1000);
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = getAdminClient();
  const { data: conversation } = await admin
    .from('ai_conversations')
    .select('gym_id')
    .eq('id', parsed.data.conversation_id)
    .maybeSingle();

  if (
    !conversation ||
    !verifyConversationToken(
      parsed.data.conversation_id,
      conversation.gym_id,
      parsed.data.conversation_token
    )
  ) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!(await assertOpenConversation(parsed.data.conversation_id, conversation.gym_id))) {
    return new Response(JSON.stringify({ error: 'Conversation not available' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        for await (const event of streamWebChatMessage(
          parsed.data.conversation_id,
          parsed.data.message
        )) {
          send(event as Record<string, unknown>);
        }
      } catch {
        send({ type: 'error', message: 'Chat unavailable right now.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

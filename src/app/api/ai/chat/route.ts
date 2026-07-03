import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { startWebChatConversation, sendWebChatMessage, sendChatSmsFollowUp } from '@/services/ai-front-desk';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  signConversationToken,
  verifyConversationToken,
} from '@/lib/auth/conversation-token';

const startSchema = z.object({ gym_id: z.string().uuid() });
const messageSchema = z.object({
  conversation_id: z.string().uuid(),
  conversation_token: z.string().min(1),
  message: z.string().min(1).max(2000),
});
const smsFollowupSchema = z.object({
  conversation_id: z.string().uuid(),
  conversation_token: z.string().min(1),
  phone: z.string().min(10).max(30),
});

async function assertOpenConversation(conversationId: string, gymId: string) {
  const admin = getAdminClient();
  const { data: conversation } = await admin
    .from('ai_conversations')
    .select('id, gym_id, status')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conversation || conversation.gym_id !== gymId || conversation.status !== 'open') {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limit = await checkRateLimit(`ai-chat:${ip}`, 30, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = (body as { action?: string }).action;

  if (action === 'start') {
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const admin = getAdminClient();
    const { data: gym } = await admin
      .from('gyms')
      .select('ai_front_desk_enabled, website_enabled')
      .eq('id', parsed.data.gym_id)
      .maybeSingle();

    if (!gym?.ai_front_desk_enabled || !gym.website_enabled) {
      return NextResponse.json({ error: 'AI chat not available' }, { status: 403 });
    }

    const conversationId = await startWebChatConversation(parsed.data.gym_id);
    const conversationToken = signConversationToken(conversationId, parsed.data.gym_id);
    return NextResponse.json({ conversation_id: conversationId, conversation_token: conversationToken });
  }

  if (action === 'sms_followup') {
    const parsed = smsFollowupSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!(await assertOpenConversation(parsed.data.conversation_id, conversation.gym_id))) {
      return NextResponse.json({ error: 'Conversation not available' }, { status: 403 });
    }

    await admin
      .from('ai_conversations')
      .update({ visitor_phone: parsed.data.phone })
      .eq('id', parsed.data.conversation_id);

    await sendChatSmsFollowUp(parsed.data.conversation_id);
    return NextResponse.json({ ok: true });
  }

  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!(await assertOpenConversation(parsed.data.conversation_id, conversation.gym_id))) {
    return NextResponse.json({ error: 'Conversation not available' }, { status: 403 });
  }

  const { reply, leadCaptured } = await sendWebChatMessage(parsed.data.conversation_id, parsed.data.message);
  return NextResponse.json({ reply, lead_captured: leadCaptured });
}

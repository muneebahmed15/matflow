import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { startWebChatConversation, sendWebChatMessage, sendChatSmsFollowUp } from '@/services/ai-front-desk';
import { checkRateLimit } from '@/lib/rate-limit';

const startSchema = z.object({ gym_id: z.string().uuid() });
const messageSchema = z.object({
  conversation_id: z.string().uuid(),
  message: z.string().min(1).max(2000),
});
const smsFollowupSchema = z.object({
  conversation_id: z.string().uuid(),
  phone: z.string().min(10).max(30),
});

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
    return NextResponse.json({ conversation_id: conversationId });
  }

  if (action === 'sms_followup') {
    const parsed = smsFollowupSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const admin = getAdminClient();
    await admin
      .from('ai_conversations')
      .update({ visitor_phone: parsed.data.phone })
      .eq('id', parsed.data.conversation_id);

    await sendChatSmsFollowUp(parsed.data.conversation_id);
    return NextResponse.json({ ok: true });
  }

  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { reply, leadCaptured } = await sendWebChatMessage(parsed.data.conversation_id, parsed.data.message);
  return NextResponse.json({ reply, lead_captured: leadCaptured });
}

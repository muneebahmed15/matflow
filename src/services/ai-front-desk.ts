import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { findKnowledgeReply } from '@/services/ai-knowledge';
import { generateLlmReply } from '@/lib/ai/llm';
import { createLead } from '@/services/leads';
import { sendSms } from '@/lib/sms/twilio';
import { getPublicEnv } from '@/lib/env';

export async function startWebChatConversation(gymId: string): Promise<string> {
  const admin = getAdminClient();

  const { data: gym } = await admin
    .from('gyms')
    .select('ai_front_desk_enabled, name')
    .eq('id', gymId)
    .maybeSingle();

  if (!gym?.ai_front_desk_enabled) {
    throw new ServiceError(403, 'AI front desk is not enabled for this gym.');
  }

  const { data, error } = await admin
    .from('ai_conversations')
    .insert({ gym_id: gymId, channel: 'web_chat', status: 'open' })
    .select('id')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data.id;
}

async function getGymChatContext(gymId: string) {
  const admin = getAdminClient();

  const { data: gym } = await admin
    .from('gyms')
    .select('name, slug')
    .eq('id', gymId)
    .single();

  const { data: classes } = await admin
    .from('classes')
    .select('name, day_of_week, start_time')
    .eq('gym_id', gymId)
    .order('day_of_week')
    .limit(10);

  const scheduleSummary =
    classes && classes.length > 0
      ? classes
          .map((c) => `${c.name} on day ${c.day_of_week} at ${c.start_time}`)
          .join('; ')
      : undefined;

  return {
    gymName: gym?.name ?? 'our gym',
    gymSlug: gym?.slug ?? '',
    scheduleSummary,
    pricingSummary: 'See our Pricing page for membership plans.',
  };
}

async function handleToolCall(
  gymId: string,
  conversationId: string,
  toolCall: { name: string; args: Record<string, string> }
): Promise<void> {
  const admin = getAdminClient();

  if (toolCall.name === 'book_trial' || toolCall.name === 'capture_lead') {
    const firstName = toolCall.args.first_name?.trim() || 'Chat';
    const lastName = toolCall.args.last_name?.trim() || 'Visitor';
    const email = toolCall.args.email?.trim();
    const phone = toolCall.args.phone?.trim();

    const lead = await createLead({
      gymId,
      firstName,
      lastName,
      email,
      phone,
      source: 'ai_chat',
      skipAutomation: false,
      smsConsent: Boolean(phone),
    });

    await admin
      .from('ai_conversations')
      .update({
        lead_id: lead.id,
        visitor_name: `${firstName} ${lastName}`.trim(),
        visitor_email: email ?? null,
        visitor_phone: phone ?? null,
      })
      .eq('id', conversationId);

    if (toolCall.name === 'book_trial') {
      await admin
        .from('leads')
        .update({ status: 'trial_scheduled' })
        .eq('id', lead.id)
        .eq('gym_id', gymId);
    }

    try {
      const { createCrmNote } = await import('@/services/crm-notes');
      await createCrmNote({
        gymId,
        leadId: lead.id,
        noteType: 'system',
        body: `AI chat ${toolCall.name === 'book_trial' ? 'booked a trial' : 'captured contact info'} (${firstName} ${lastName}${email ? `, ${email}` : ''}).`,
      });
    } catch {
      // CRM note must not block chat flow
    }
  }
}

export async function sendWebChatMessage(
  conversationId: string,
  userMessage: string
): Promise<{ reply: string; leadCaptured?: boolean }> {
  const admin = getAdminClient();

  const { data: conv } = await admin
    .from('ai_conversations')
    .select('gym_id, status, visitor_phone, sms_followup_sent')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conv) throw new ServiceError(404, 'Conversation not found');
  if (conv.status === 'closed') throw new ServiceError(400, 'Conversation is closed');

  const ctx = await getGymChatContext(conv.gym_id);

  await admin.from('ai_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: userMessage.trim(),
  });

  const { data: history } = await admin
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20);

  const knowledgeReply = await findKnowledgeReply(conv.gym_id, userMessage);
  const llmResult = knowledgeReply
    ? { message: knowledgeReply }
    : await generateLlmReply(
        userMessage,
        (history ?? [])
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        ctx
      );

  let leadCaptured = false;
  if (llmResult.toolCall) {
    await handleToolCall(conv.gym_id, conversationId, llmResult.toolCall);
    leadCaptured = llmResult.toolCall.name === 'book_trial' || llmResult.toolCall.name === 'capture_lead';
  }

  const reply = llmResult.message;

  await admin.from('ai_messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: reply,
  });

  return { reply, leadCaptured };
}

export async function sendChatSmsFollowUp(conversationId: string): Promise<void> {
  const admin = getAdminClient();

  const { data: conv } = await admin
    .from('ai_conversations')
    .select('gym_id, visitor_phone, sms_followup_sent, status')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conv?.visitor_phone || conv.sms_followup_sent) return;

  const { data: gym } = await admin
    .from('gyms')
    .select('name, slug')
    .eq('id', conv.gym_id)
    .single();

  const trialUrl = `${getPublicEnv().NEXT_PUBLIC_APP_URL}/g/${gym?.slug}/trial`;

  await sendSms({
    to: conv.visitor_phone,
    body: `Thanks for chatting with ${gym?.name}! Book your free trial anytime: ${trialUrl} Reply STOP to opt out.`,
  });

  await admin
    .from('ai_conversations')
    .update({ sms_followup_sent: true })
    .eq('id', conversationId);
}

export async function listConversations(gymId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('ai_conversations')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

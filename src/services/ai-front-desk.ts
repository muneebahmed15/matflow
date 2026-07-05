import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { findKnowledgeReply } from '@/services/ai-knowledge';
import { generateLlmReply } from '@/lib/ai/llm';
import { streamLlmReply } from '@/lib/ai/llm-stream';
import { moderateUserInput, MODERATION_BLOCK_MESSAGE } from '@/lib/ai/moderation';
import { assertAiUsageWithinLimit, recordAiUsage } from '@/lib/ai/usage-metering';
import { createLead } from '@/services/leads';
import { sendSms } from '@/lib/sms/twilio';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { getPublicEnv } from '@/lib/env';
import { defaultOffHoursMessage, isGymLikelyOpen } from '@/lib/ai-business-hours';
import { redactPii } from '@/lib/pii-redact';
import { logger } from '@/lib/logger';

export type AiConversationAnalytics = {
  resolutionRate: number | null;
  avgResponseMs: number | null;
  totalClosed: number;
  totalEscalated: number;
  avgCsat: number | null;
};
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
    .select('name, slug, ai_persona_name, ai_tone, ai_languages')
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
    personaName: gym?.ai_persona_name?.trim() || 'Front Desk',
    tone: gym?.ai_tone === 'formal' ? ('formal' as const) : ('friendly' as const),
    languages: Array.isArray(gym?.ai_languages) ? gym.ai_languages : ['en'],
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
    return;
  }

  if (toolCall.name === 'escalate_to_human') {
    await admin
      .from('ai_conversations')
      .update({ status: 'escalated', escalated_at: new Date().toISOString() })
      .eq('id', conversationId);

    const { data: gym } = await admin
      .from('gyms')
      .select('name, owner_id')
      .eq('id', gymId)
      .single();

    const reason = toolCall.args.reason?.trim() || 'Visitor requested staff assistance';

    try {
      const { createCrmNote } = await import('@/services/crm-notes');
      const { data: conv } = await admin
        .from('ai_conversations')
        .select('lead_id')
        .eq('id', conversationId)
        .maybeSingle();

      if (conv?.lead_id) {
        await createCrmNote({
          gymId,
          leadId: conv.lead_id,
          noteType: 'system',
          body: `AI chat escalated to staff: ${reason}`,
        });
      }
    } catch {
      // best-effort
    }

    if (gym?.owner_id) {
      try {
        const { data: owner } = await admin.auth.admin.getUserById(gym.owner_id);
        const email = owner?.user?.email;
        if (email) {
          await sendTransactionalEmail({
            to: email,
            subject: `${gym.name} — AI chat needs follow-up`,
            html: `<p>A visitor requested staff assistance via AI chat.</p><p><strong>Reason:</strong> ${reason}</p><p>Review conversations in AI Desk.</p>`,
            text: `AI chat escalated at ${gym.name}: ${reason}`,
          });
        }
      } catch {
        // best-effort
      }
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

  await assertAiUsageWithinLimit(conv.gym_id);

  const moderation = await moderateUserInput(userMessage);
  if (moderation.flagged) {
    await admin.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: userMessage.trim(),
    });
    await admin.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: MODERATION_BLOCK_MESSAGE,
    });
    return { reply: MODERATION_BLOCK_MESSAGE };
  }

  const ctx = await getGymChatContext(conv.gym_id);

  logger.info(
    { conversationId, gymId: conv.gym_id, messagePreview: redactPii(userMessage.slice(0, 120)) },
    'AI chat message'
  );

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
  let escalated = false;
  if (llmResult.toolCall) {
    await handleToolCall(conv.gym_id, conversationId, llmResult.toolCall);
    leadCaptured = llmResult.toolCall.name === 'book_trial' || llmResult.toolCall.name === 'capture_lead';
    escalated = llmResult.toolCall.name === 'escalate_to_human';
  }

  const reply = escalated
    ? "I've notified our team — someone will follow up with you shortly. You can also use the Contact page for immediate help."
    : llmResult.message;

  await admin.from('ai_messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: reply,
  });

  await recordAiUsage({ gymId: conv.gym_id, channel: 'web_chat' });

  return { reply, leadCaptured };
}

export type WebChatStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; reply: string; leadCaptured?: boolean; blocked?: boolean };

export async function* streamWebChatMessage(
  conversationId: string,
  userMessage: string
): AsyncGenerator<WebChatStreamEvent, void, undefined> {
  const admin = getAdminClient();

  const { data: conv } = await admin
    .from('ai_conversations')
    .select('gym_id, status')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conv) throw new ServiceError(404, 'Conversation not found');
  if (conv.status === 'closed') throw new ServiceError(400, 'Conversation is closed');

  const moderation = await moderateUserInput(userMessage);
  await admin.from('ai_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: userMessage.trim(),
  });

  if (moderation.flagged) {
    await admin.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: MODERATION_BLOCK_MESSAGE,
    });
    yield { type: 'delta', text: MODERATION_BLOCK_MESSAGE };
    yield { type: 'done', reply: MODERATION_BLOCK_MESSAGE, blocked: true };
    return;
  }

  const ctx = await getGymChatContext(conv.gym_id);

  const { data: history } = await admin
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20);

  const chatHistory = (history ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const knowledgeReply = await findKnowledgeReply(conv.gym_id, userMessage);
  if (knowledgeReply) {
    yield { type: 'delta', text: knowledgeReply };
    await admin.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: knowledgeReply,
    });
    yield { type: 'done', reply: knowledgeReply };
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    const llmResult = await generateLlmReply(userMessage, chatHistory, ctx);
    let leadCaptured = false;
    if (llmResult.toolCall) {
      await handleToolCall(conv.gym_id, conversationId, llmResult.toolCall);
      leadCaptured =
        llmResult.toolCall.name === 'book_trial' || llmResult.toolCall.name === 'capture_lead';
    }
    const reply =
      llmResult.toolCall?.name === 'escalate_to_human'
        ? "I've notified our team — someone will follow up with you shortly. You can also use the Contact page for immediate help."
        : llmResult.message;

    yield { type: 'delta', text: reply };
    await admin.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: reply,
    });
    yield { type: 'done', reply, leadCaptured };
    return;
  }

  const stream = streamLlmReply(userMessage, chatHistory, ctx);
  let reply = '';

  while (true) {
    const next = await stream.next();
    if (next.done) {
      reply = next.value.message || reply || 'Thanks for your message!';
      break;
    }
    reply += next.value;
    yield { type: 'delta', text: next.value };
  }

  await admin.from('ai_messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: reply,
  });

  yield { type: 'done', reply };
}

export async function getAiChatWelcomeContext(gymId: string): Promise<{
  offHours: boolean;
  offHoursMessage: string | null;
}> {
  const admin = getAdminClient();
  const { data: gym } = await admin
    .from('gyms')
    .select('name, timezone, ai_off_hours_message')
    .eq('id', gymId)
    .maybeSingle();

  if (!gym) return { offHours: false, offHoursMessage: null };

  const open = isGymLikelyOpen(gym.timezone ?? 'America/New_York');
  if (open) return { offHours: false, offHoursMessage: null };

  return {
    offHours: true,
    offHoursMessage:
      gym.ai_off_hours_message?.trim() || defaultOffHoursMessage(gym.name ?? 'our gym'),
  };
}

export async function submitConversationCsat(
  conversationId: string,
  gymId: string,
  rating: number
): Promise<void> {
  if (rating < 1 || rating > 5) throw new ServiceError(400, 'Rating must be 1–5');

  const admin = getAdminClient();
  const { error } = await admin
    .from('ai_conversations')
    .update({ csat_rating: rating, status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

export async function sendChatSmsFollowUp(conversationId: string): Promise<void> {
  const admin = getAdminClient();

  const { data: conv } = await admin
    .from('ai_conversations')
    .select('gym_id, visitor_phone, sms_followup_sent, status')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conv?.visitor_phone || conv.sms_followup_sent) return;

  const normalized = conv.visitor_phone.replace(/\D/g, '');
  const { data: optedOut } = await admin
    .from('sms_opt_outs')
    .select('phone')
    .eq('gym_id', conv.gym_id)
    .eq('phone', normalized)
    .maybeSingle();

  if (optedOut) return;

  const { data: gym } = await admin
    .from('gyms')
    .select('name, slug, twilio_phone')
    .eq('id', conv.gym_id)
    .single();
  const trialUrl = `${getPublicEnv().NEXT_PUBLIC_APP_URL}/g/${gym?.slug}/trial`;

  await sendSms({
    to: conv.visitor_phone,
    from: gym?.twilio_phone ?? undefined,
    body: `Thanks for chatting with ${gym?.name}! Book your free trial anytime: ${trialUrl} Reply STOP to opt out.`,
  });

  await admin.from('sms_consent_log').insert({
    gym_id: conv.gym_id,
    phone: normalized,
    consented: true,
    source: 'ai_chat_followup',
  });

  await admin    .from('ai_conversations')
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

export async function getAiConversationAnalytics(gymId: string): Promise<AiConversationAnalytics> {
  const admin = getAdminClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: convos } = await admin
    .from('ai_conversations')
    .select('id, status, csat_rating, created_at, escalated_at')
    .eq('gym_id', gymId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const closed = (convos ?? []).filter((c) => c.status === 'closed');
  const escalated = (convos ?? []).filter((c) => c.status === 'escalated' || c.escalated_at);
  const resolved = (convos ?? []).filter((c) => c.status === 'closed' && !c.escalated_at);
  const total = (convos ?? []).length;
  const resolutionRate =
    total > 0 ? Math.round((resolved.length / total) * 1000) / 10 : null;

  const csatRatings = (convos ?? [])
    .map((c) => c.csat_rating)
    .filter((r): r is number => r != null);
  const avgCsat =
    csatRatings.length > 0
      ? Math.round((csatRatings.reduce((a, b) => a + b, 0) / csatRatings.length) * 10) / 10
      : null;

  const convoIds = (convos ?? []).slice(0, 50).map((c) => c.id);
  let avgResponseMs: number | null = null;

  if (convoIds.length > 0) {
    const { data: messages } = await admin
      .from('ai_messages')
      .select('conversation_id, role, created_at')
      .in('conversation_id', convoIds)
      .order('created_at', { ascending: true });

  const byConv = new Map<string, { role: string; created_at: string }[]>();
  for (const m of messages ?? []) {
    const list = byConv.get(m.conversation_id) ?? [];
    list.push({ role: m.role, created_at: m.created_at });
    byConv.set(m.conversation_id, list);
  }

  const deltas: number[] = [];
  for (const msgs of byConv.values()) {
    for (let i = 1; i < msgs.length; i++) {
      if (msgs[i - 1]?.role === 'user' && msgs[i]?.role === 'assistant') {
        deltas.push(
          new Date(msgs[i]!.created_at).getTime() - new Date(msgs[i - 1]!.created_at).getTime()
        );
      }
    }
  }
  if (deltas.length > 0) {
    avgResponseMs = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
  }
  }

  return {
    resolutionRate,
    avgResponseMs,
    totalClosed: closed.length,
    totalEscalated: escalated.length,
    avgCsat,
  };
}

export async function handleInboundSms(input: {
  gymId: string;
  from: string;
  body: string;
}): Promise<{ reply?: string }> {
  const admin = getAdminClient();
  const phone = input.from.replace(/\D/g, '');
  const body = input.body.trim();
  const upper = body.toUpperCase();

  if (upper === 'STOP' || upper === 'UNSUBSCRIBE') {
    await admin.from('sms_opt_outs').upsert(
      { gym_id: input.gymId, phone, opted_out_at: new Date().toISOString() },
      { onConflict: 'gym_id,phone' }
    );
    await admin.from('sms_consent_log').insert({
      gym_id: input.gymId,
      phone,
      consented: false,
      source: 'sms_stop',
    });
    return { reply: 'You have been unsubscribed. Reply START to opt back in.' };
  }

  if (upper === 'START') {
    await admin.from('sms_opt_outs').delete().eq('gym_id', input.gymId).eq('phone', phone);
    return { reply: 'You are opted back in to messages from us.' };
  }

  const { data: gym } = await admin
    .from('gyms')
    .select('ai_front_desk_enabled')
    .eq('id', input.gymId)
    .maybeSingle();

  if (!gym?.ai_front_desk_enabled) {
    return { reply: 'Thanks for your message. A team member will follow up soon.' };
  }

  const { data: conv } = await admin
    .from('ai_conversations')
    .insert({
      gym_id: input.gymId,
      channel: 'sms',
      status: 'open',
      visitor_phone: phone,
    })
    .select('id')
    .single();

  if (!conv) return {};

  const { reply } = await sendWebChatMessage(conv.id, body);

  try {
    const { createCrmNote } = await import('@/services/crm-notes');
    const { data: existingLead } = await admin
      .from('leads')
      .select('id')
      .eq('gym_id', input.gymId)
      .eq('phone', phone)
      .maybeSingle();

    const leadId =
      existingLead?.id ??
      (
        await (async () => {
          const { createLead } = await import('@/services/leads');
          const lead = await createLead({
            gymId: input.gymId,
            firstName: 'SMS',
            lastName: 'Visitor',
            phone,
            source: 'sms',
            skipAutomation: true,
            smsConsent: true,
          });
          await admin
            .from('ai_conversations')
            .update({ lead_id: lead.id, visitor_phone: phone })
            .eq('id', conv.id);
          return lead.id;
        })()
      );

    await createCrmNote({
      gymId: input.gymId,
      leadId,
      noteType: 'system',
      body: `Inbound SMS: ${body.slice(0, 500)}`,
    });
  } catch {
    // best-effort CRM logging
  }

  return { reply };
}

export async function handleInboundEmail(input: {
  gymId: string;
  fromEmail: string;
  subject: string;
  body: string;
}): Promise<void> {
  const admin = getAdminClient();
  const { data: gym } = await admin
    .from('gyms')
    .select('ai_front_desk_enabled, ai_email_auto_reply, name')
    .eq('id', input.gymId)
    .maybeSingle();

  if (!gym?.ai_front_desk_enabled) return;

  const { data: conv } = await admin
    .from('ai_conversations')
    .insert({
      gym_id: input.gymId,
      channel: 'email',
      status: 'open',
      visitor_email: input.fromEmail,
    })
    .select('id')
    .single();

  if (!conv) return;

  const userText = `${input.subject}\n\n${input.body}`.trim();
  await admin.from('ai_messages').insert({
    conversation_id: conv.id,
    role: 'user',
    content: userText.slice(0, 8000),
  });

  const knowledgeReply = await findKnowledgeReply(input.gymId, userText);
  const ctx = await getGymChatContext(input.gymId);
  const reply = knowledgeReply ?? (await generateLlmReply(userText, [], ctx)).message;

  const autoSend = gym.ai_email_auto_reply && Boolean(knowledgeReply);

  await admin.from('ai_messages').insert({
    conversation_id: conv.id,
    role: 'assistant',
    content: reply,
    approval_status: autoSend ? 'sent' : 'pending',
  });

  if (autoSend && input.fromEmail) {
    await sendTransactionalEmail({
      to: input.fromEmail,
      subject: `Re: ${input.subject || gym.name}`,
      html: `<p>${reply.replace(/\n/g, '<br/>')}</p>`,
      text: reply,
    }).catch(() => undefined);
  }

  await recordAiUsage({ gymId: input.gymId, channel: 'email' });
}

export async function approveEmailDraft(input: {
  gymId: string;
  messageId: string;
  actorId: string;
}): Promise<void> {
  const admin = getAdminClient();
  const { data: message } = await admin
    .from('ai_messages')
    .select('id, content, conversation_id, approval_status')
    .eq('id', input.messageId)
    .maybeSingle();

  if (!message || message.approval_status !== 'pending') {
    throw new ServiceError(400, 'Draft not pending approval');
  }

  const { data: conv } = await admin
    .from('ai_conversations')
    .select('visitor_email, gym_id')
    .eq('id', message.conversation_id)
    .maybeSingle();

  if (!conv || conv.gym_id !== input.gymId || !conv.visitor_email) {
    throw new ServiceError(400, 'Conversation missing visitor email');
  }

  await sendTransactionalEmail({
    to: conv.visitor_email,
    subject: 'Reply from our team',
    html: `<p>${message.content.replace(/\n/g, '<br/>')}</p>`,
    text: message.content,
  });

  await admin
    .from('ai_messages')
    .update({
      approval_status: 'sent',
      approved_by: input.actorId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', input.messageId);
}

export type PendingEmailDraft = {
  id: string;
  content: string;
  created_at: string;
  visitor_email: string | null;
  subject_context: string | null;
};

export async function listPendingEmailDrafts(gymId: string): Promise<PendingEmailDraft[]> {
  const admin = getAdminClient();
  const { data: convs } = await admin
    .from('ai_conversations')
    .select('id, visitor_email')
    .eq('gym_id', gymId)
    .eq('channel', 'email');

  const convIds = (convs ?? []).map((c) => c.id);
  if (convIds.length === 0) return [];

  const emailByConv = new Map((convs ?? []).map((c) => [c.id, c.visitor_email as string | null]));

  const { data: messages } = await admin
    .from('ai_messages')
    .select('id, content, created_at, conversation_id')
    .in('conversation_id', convIds)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  return (messages ?? []).map((m) => ({
    id: m.id,
    content: m.content,
    created_at: m.created_at,
    visitor_email: emailByConv.get(m.conversation_id) ?? null,
    subject_context: null,
  }));
}

export async function rejectEmailDraft(input: {
  gymId: string;
  messageId: string;
  actorId: string;
}): Promise<void> {
  const admin = getAdminClient();
  const { data: message } = await admin
    .from('ai_messages')
    .select('id, conversation_id, approval_status')
    .eq('id', input.messageId)
    .maybeSingle();

  if (!message || message.approval_status !== 'pending') {
    throw new ServiceError(400, 'Draft not pending approval');
  }

  const { data: conv } = await admin
    .from('ai_conversations')
    .select('gym_id')
    .eq('id', message.conversation_id)
    .maybeSingle();

  if (!conv || conv.gym_id !== input.gymId) {
    throw new ServiceError(400, 'Conversation not found');
  }

  await admin
    .from('ai_messages')
    .update({
      approval_status: 'rejected',
      approved_by: input.actorId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', input.messageId);
}

export async function handleInboundMetaMessage(input: {
  gymId: string;
  channel: 'messenger' | 'instagram';
  senderId: string;
  text: string;
}): Promise<{ reply?: string }> {
  const admin = getAdminClient();
  const { data: conv } = await admin
    .from('ai_conversations')
    .insert({
      gym_id: input.gymId,
      channel: input.channel,
      status: 'open',
      visitor_name: input.senderId,
    })
    .select('id')
    .single();

  if (!conv) return {};
  const { reply } = await sendWebChatMessage(conv.id, input.text);
  await recordAiUsage({ gymId: input.gymId, channel: input.channel });
  return { reply };
}
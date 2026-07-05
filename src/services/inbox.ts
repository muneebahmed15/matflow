import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type InboxItem = {
  id: string;
  type: 'lead' | 'chat' | 'sms';
  title: string;
  subtitle: string | null;
  status: string;
  channel: string;
  createdAt: string;
  leadId?: string;
  conversationId?: string;
};

export async function listInboxItems(gymId: string): Promise<InboxItem[]> {
  const admin = getAdminClient();
  const items: InboxItem[] = [];

  const { data: leads } = await admin
    .from('leads')
    .select('id, first_name, last_name, email, phone, status, source, created_at')
    .eq('gym_id', gymId)
    .in('status', ['new', 'trial_scheduled', 'contacted'])
    .order('created_at', { ascending: false })
    .limit(30);

  for (const lead of leads ?? []) {
    items.push({
      id: `lead-${lead.id}`,
      type: 'lead',
      title: `${lead.first_name} ${lead.last_name}`,
      subtitle: lead.email ?? lead.phone,
      status: lead.status,
      channel: lead.source ?? 'unknown',
      createdAt: lead.created_at,
      leadId: lead.id,
    });
  }

  const { data: chats } = await admin
    .from('ai_conversations')
    .select('id, status, channel, visitor_name, visitor_email, visitor_phone, lead_id, created_at')
    .eq('gym_id', gymId)
    .in('status', ['open', 'escalated'])
    .order('created_at', { ascending: false })
    .limit(30);

  for (const chat of chats ?? []) {
    items.push({
      id: `chat-${chat.id}`,
      type: 'chat',
      title: chat.visitor_name ?? 'Website chat',
      subtitle: chat.visitor_email ?? chat.visitor_phone,
      status: chat.status,
      channel: chat.channel,
      createdAt: chat.created_at,
      leadId: chat.lead_id ?? undefined,
      conversationId: chat.id,
    });
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getConversationMessages(conversationId: string, gymId: string) {
  const admin = getAdminClient();

  const { data: conv } = await admin
    .from('ai_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!conv) throw new ServiceError(404, 'Conversation not found');

  const { data, error } = await admin
    .from('ai_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

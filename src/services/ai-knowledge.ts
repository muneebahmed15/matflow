import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type GymKnowledge = {
  id: string;
  gym_id: string;
  topic: string;
  content: string;
  updated_at: string;
};

export async function listKnowledge(gymId: string): Promise<GymKnowledge[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gym_knowledge')
    .select('*')
    .eq('gym_id', gymId)
    .order('topic');

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as GymKnowledge[];
}

export async function upsertKnowledge(input: {
  gymId: string;
  topic: string;
  content: string;
}): Promise<GymKnowledge> {
  const admin = getAdminClient();
  const topic = input.topic.trim().toLowerCase();
  const content = input.content.trim();
  if (!topic || !content) throw new ServiceError(400, 'Topic and content required');

  const { data: existing } = await admin
    .from('gym_knowledge')
    .select('id')
    .eq('gym_id', input.gymId)
    .eq('topic', topic)
    .maybeSingle();

  if (existing) {
    const { data: prior } = await admin
      .from('gym_knowledge')
      .select('topic, content')
      .eq('id', existing.id)
      .single();

    if (prior && prior.content !== content) {
      await admin.from('gym_knowledge_versions').insert({
        gym_id: input.gymId,
        knowledge_id: existing.id,
        topic: prior.topic,
        content: prior.content,
      });
    }

    const { data, error } = await admin
      .from('gym_knowledge')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw new ServiceError(500, error.message);
    return data as GymKnowledge;
  }

  const { data, error } = await admin
    .from('gym_knowledge')
    .insert({ gym_id: input.gymId, topic, content })
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as GymKnowledge;
}

export async function deleteKnowledge(gymId: string, knowledgeId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('gym_knowledge')
    .delete()
    .eq('id', knowledgeId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

export async function findKnowledgeReply(
  gymId: string,
  userMessage: string
): Promise<string | null> {
  const entries = await listKnowledge(gymId);
  const lower = userMessage.toLowerCase();

  for (const entry of entries) {
    if (lower.includes(entry.topic)) {
      return entry.content;
    }
  }
  return null;
}

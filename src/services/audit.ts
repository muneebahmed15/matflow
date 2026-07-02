import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type AuditEvent = {
  id: string;
  gym_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export async function listAuditEvents(gymId: string, limit = 50): Promise<AuditEvent[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('audit_events')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as AuditEvent[];
}

export async function logAuditEvent(input: {
  gymId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from('audit_events').insert({
    gym_id: input.gymId,
    actor_id: input.actorId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    payload: input.payload ?? null,
  });

  if (error) throw new ServiceError(500, error.message);
}

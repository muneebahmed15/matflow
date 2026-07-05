import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type CrmNoteType = 'general' | 'call' | 'email' | 'in_person' | 'system';

export type CrmNote = {
  id: string;
  gym_id: string;
  member_id: string | null;
  lead_id: string | null;
  author_id: string | null;
  note_type: CrmNoteType;
  body: string;
  is_pinned: boolean;
  created_at: string;
};

export async function listMemberNotes(gymId: string, memberId: string): Promise<CrmNote[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('crm_notes')
    .select('*')
    .eq('gym_id', gymId)
    .eq('member_id', memberId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as CrmNote[];
}

export async function listLeadNotes(gymId: string, leadId: string): Promise<CrmNote[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('crm_notes')
    .select('*')
    .eq('gym_id', gymId)
    .eq('lead_id', leadId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as CrmNote[];
}

export type CreateCrmNoteInput = {
  gymId: string;
  authorId?: string | null;
  body: string;
  noteType?: CrmNoteType;
  memberId?: string;
  leadId?: string;
};

export async function createCrmNote(input: CreateCrmNoteInput): Promise<CrmNote> {
  const body = input.body.trim();
  if (!body) throw new ServiceError(400, 'Note body is required.');
  if (!input.memberId && !input.leadId) {
    throw new ServiceError(400, 'Note must be linked to a member or lead.');
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('crm_notes')
    .insert({
      gym_id: input.gymId,
      member_id: input.memberId ?? null,
      lead_id: input.leadId ?? null,
      author_id: input.authorId ?? null,
      note_type: input.noteType ?? 'general',
      body,
    })
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as CrmNote;
}

export async function deleteCrmNote(gymId: string, noteId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('crm_notes')
    .delete()
    .eq('id', noteId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

export async function toggleCrmNotePin(
  gymId: string,
  noteId: string,
  isPinned: boolean
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('crm_notes')
    .update({ is_pinned: isPinned })
    .eq('id', noteId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

export type CrmNoteSearchResult = CrmNote & {
  member_name: string | null;
  lead_name: string | null;
};

export async function searchCrmNotes(
  gymId: string,
  query: string,
  limit = 30
): Promise<CrmNoteSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('crm_notes')
    .select('*, members(first_name, last_name), leads(first_name, last_name)')
    .eq('gym_id', gymId)
    .ilike('body', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new ServiceError(500, error.message);

  return (data ?? []).map((row) => {
    const note = row as CrmNote & {
      members: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
      leads: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
    };
    const member = Array.isArray(note.members) ? note.members[0] : note.members;
    const lead = Array.isArray(note.leads) ? note.leads[0] : note.leads;
    return {
      id: note.id,
      gym_id: note.gym_id,
      member_id: note.member_id,
      lead_id: note.lead_id,
      author_id: note.author_id,
      note_type: note.note_type,
      body: note.body,
      is_pinned: note.is_pinned,
      created_at: note.created_at,
      member_name: member ? `${member.first_name} ${member.last_name}`.trim() : null,
      lead_name: lead ? `${lead.first_name} ${lead.last_name}`.trim() : null,
    };
  });
}

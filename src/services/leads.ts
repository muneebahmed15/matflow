import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';

type LeadRow = Database['public']['Tables']['leads']['Row'];

export async function listLeads(gymId: string): Promise<LeadRow[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('leads')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export type CreateLeadInput = {
  gymId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source?: string;
  interestedIn?: string;
};

export async function createLead(input: CreateLeadInput): Promise<LeadRow> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('leads')
    .insert({
      gym_id: input.gymId,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      source: input.source ?? 'walk-in',
      interested_in: input.interestedIn?.trim() || null,
      status: 'new',
    })
    .select()
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data;
}

export async function updateLeadStatus(
  gymId: string,
  leadId: string,
  status: string
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('leads')
    .update({ status })
    .eq('id', leadId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

export async function convertLeadToMember(
  gymId: string,
  leadId: string
): Promise<{ memberId: string }> {
  const admin = getAdminClient();

  const { data: lead, error: leadErr } = await admin
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (leadErr) throw new ServiceError(500, leadErr.message);
  if (!lead) throw new ServiceError(404, 'Lead not found');

  const { data: newMember, error: memberErr } = await admin
    .from('members')
    .insert({
      gym_id: gymId,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      belt_rank: 'white',
      status: 'active',
    })
    .select('id')
    .single();

  if (memberErr) throw new ServiceError(500, memberErr.message);

  const { error: updateErr } = await admin
    .from('leads')
    .update({ status: 'converted', converted_member_id: newMember.id })
    .eq('id', leadId)
    .eq('gym_id', gymId);

  if (updateErr) throw new ServiceError(500, updateErr.message);

  return { memberId: newMember.id };
}

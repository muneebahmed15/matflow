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
  notes?: string;
  smsConsent?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  trialDate?: string;
  skipAutomation?: boolean;
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
      notes: input.notes?.trim() || null,
      status: 'new',
      sms_consent: input.smsConsent ?? false,
      utm_source: input.utmSource?.trim() || null,
      utm_medium: input.utmMedium?.trim() || null,
      utm_campaign: input.utmCampaign?.trim() || null,
      trial_date: input.trialDate || null,
    })
    .select()
    .single();

  if (error) throw new ServiceError(500, error.message);

  if (input.smsConsent && input.phone) {
    await admin.from('sms_consent_log').insert({
      gym_id: input.gymId,
      phone: input.phone.trim(),
      lead_id: data.id,
      consented: true,
      source: input.source ?? 'form',
    });
  }

  if (!input.skipAutomation) {
    const { runNewLeadAutomations } = await import('@/services/lead-automation');
    void runNewLeadAutomations(data.id).catch(() => undefined);
  }

  return data;
}

export type LeadSourceStat = { source: string; count: number };

export async function getLeadSourceStats(gymId: string): Promise<LeadSourceStat[]> {
  const admin = getAdminClient();
  const { data, error } = await admin.from('leads').select('source').eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = row.source ?? 'unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}

export type MarketingFunnel = {
  leads: number;
  trialScheduled: number;
  contacted: number;
  converted: number;
  lost: number;
};

export async function getMarketingFunnel(gymId: string): Promise<MarketingFunnel> {
  const admin = getAdminClient();
  const { data, error } = await admin.from('leads').select('status').eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);

  const funnel: MarketingFunnel = {
    leads: 0,
    trialScheduled: 0,
    contacted: 0,
    converted: 0,
    lost: 0,
  };

  for (const row of data ?? []) {
    funnel.leads++;
    if (row.status === 'trial_scheduled') funnel.trialScheduled++;
    else if (row.status === 'contacted') funnel.contacted++;
    else if (row.status === 'converted') funnel.converted++;
    else if (row.status === 'lost') funnel.lost++;
  }

  return funnel;
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

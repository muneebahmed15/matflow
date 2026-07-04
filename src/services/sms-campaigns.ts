import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { sendSms } from '@/lib/sms/twilio';
import { dedupeAudience, audienceStatusFilter } from '@/services/marketing';
import { canSendMarketingSms } from '@/lib/marketing-consent';

export type SmsCampaign = {
  id: string;
  gym_id: string;
  name: string;
  body: string;
  audience: string;
  status: string;
  sent_count: number;
  sent_at: string | null;
  created_at: string;
};

export async function listSmsCampaigns(gymId: string): Promise<SmsCampaign[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('sms_campaigns')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as SmsCampaign[];
}

export async function createSmsCampaign(input: {
  gymId: string;
  name: string;
  body: string;
  audience: string;
}): Promise<SmsCampaign> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('sms_campaigns')
    .insert({
      gym_id: input.gymId,
      name: input.name.trim(),
      body: input.body.trim(),
      audience: input.audience,
      status: 'draft',
    })
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as SmsCampaign;
}

async function resolveSmsAudiencePhones(gymId: string, audience: string): Promise<string[]> {
  const admin = getAdminClient();
  const statusFilter = audienceStatusFilter(audience);

  if (audience === 'leads') {
    const { data } = await admin
      .from('leads')
      .select('phone, sms_marketing_consent')
      .eq('gym_id', gymId)
      .not('phone', 'is', null);
    return [
      ...new Set(
        (data ?? [])
          .filter((r) => r.phone && canSendMarketingSms({ sms_marketing_consent: r.sms_marketing_consent ?? false }))
          .map((r) => r.phone as string)
      ),
    ];
  }

  let query = admin.from('members').select('phone, sms_marketing_consent').eq('gym_id', gymId).not('phone', 'is', null);
  if (statusFilter) query = query.eq('status', statusFilter);

  const { data } = await query;
  return [
    ...new Set(
      (data ?? [])
        .filter((r) => r.phone && canSendMarketingSms({ sms_marketing_consent: r.sms_marketing_consent ?? false }))
        .map((r) => r.phone as string)
    ),
  ];
}

export async function sendSmsCampaign(gymId: string, campaignId: string): Promise<{ sent: number }> {
  const admin = getAdminClient();
  const { data: campaign, error } = await admin
    .from('sms_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('gym_id', gymId)
    .single();

  if (error || !campaign) throw new ServiceError(404, 'Campaign not found');
  if (campaign.status === 'sent') throw new ServiceError(400, 'Campaign already sent.');

  const phones = await resolveSmsAudiencePhones(gymId, campaign.audience);
  let sent = 0;

  for (const phone of phones) {
    try {
      await sendSms({ to: phone, body: campaign.body });
      sent += 1;
    } catch {
      // Continue sending to remaining recipients.
    }
  }

  await admin
    .from('sms_campaigns')
    .update({
      status: 'sent',
      sent_count: sent,
      sent_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  return { sent };
}

/** Exported for tests — email dedupe reused for mixed channels in future. */
export { dedupeAudience };

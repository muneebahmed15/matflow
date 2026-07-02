import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { sendTransactionalEmail } from '@/lib/email/resend';

export type EmailCampaign = {
  id: string;
  gym_id: string;
  name: string;
  subject: string;
  body_html: string;
  audience: string;
  status: string;
  sent_count: number;
  created_at: string;
};

export async function listCampaigns(gymId: string): Promise<EmailCampaign[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('email_campaigns')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as EmailCampaign[];
}

export async function createCampaign(input: {
  gymId: string;
  name: string;
  subject: string;
  bodyHtml: string;
  audience: string;
}): Promise<EmailCampaign> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('email_campaigns')
    .insert({
      gym_id: input.gymId,
      name: input.name.trim(),
      subject: input.subject.trim(),
      body_html: input.bodyHtml.trim(),
      audience: input.audience,
      status: 'draft',
    })
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as EmailCampaign;
}

async function resolveAudienceEmails(
  gymId: string,
  audience: string
): Promise<string[]> {
  const admin = getAdminClient();
  let query = admin.from('members').select('email').eq('gym_id', gymId).not('email', 'is', null);

  if (audience === 'active_members') query = query.eq('status', 'active');
  else if (audience === 'inactive_members') query = query.eq('status', 'inactive');
  else if (audience === 'past_due') query = query.eq('status', 'past_due');
  else if (audience === 'leads') {
    const { data: leads } = await admin
      .from('leads')
      .select('email')
      .eq('gym_id', gymId)
      .not('email', 'is', null);
    return [...new Set((leads ?? []).map((l) => l.email).filter(Boolean) as string[])];
  }

  const { data } = await query;
  return [...new Set((data ?? []).map((m) => m.email).filter(Boolean) as string[])];
}

export async function sendCampaign(gymId: string, campaignId: string): Promise<{ sent: number }> {
  const admin = getAdminClient();

  const { data: campaign } = await admin
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('gym_id', gymId)
    .single();

  if (!campaign) throw new ServiceError(404, 'Campaign not found');
  if (campaign.status === 'sent') throw new ServiceError(400, 'Campaign already sent');

  const emails = await resolveAudienceEmails(gymId, campaign.audience);
  let sent = 0;

  for (const to of emails) {
    try {
      await sendTransactionalEmail({
        to,
        subject: campaign.subject,
        html: campaign.body_html,
        text: campaign.body_html.replace(/<[^>]+>/g, ''),
      });
      sent++;
    } catch {
      // Best-effort batch send
    }
  }

  await admin
    .from('email_campaigns')
    .update({ status: 'sent', sent_count: sent, sent_at: new Date().toISOString() })
    .eq('id', campaignId);

  return { sent };
}

export function googleReviewUrl(placeId: string | null): string | null {
  if (!placeId) return null;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export async function requestReview(
  gymId: string,
  memberId: string,
  googlePlaceId?: string | null
): Promise<void> {
  const admin = getAdminClient();

  const { data: member } = await admin
    .from('members')
    .select('email, first_name')
    .eq('id', memberId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!member?.email) throw new ServiceError(400, 'Member has no email on file.');

  const { data: gym } = await admin
    .from('gyms')
    .select('name, google_place_id')
    .eq('id', gymId)
    .single();

  const placeId = googlePlaceId ?? gym?.google_place_id ?? null;
  const reviewLink = googleReviewUrl(placeId);
  const reviewCta = reviewLink
    ? `<p><a href="${reviewLink}">Leave us a Google review</a></p>`
    : '<p>Please leave us a review on Google or your favorite platform.</p>';

  await sendTransactionalEmail({
    to: member.email,
    subject: `How was your experience at ${gym?.name ?? 'our gym'}?`,
    html: `<p>Hi ${member.first_name},</p><p>We'd love to hear about your training experience!</p>${reviewCta}`,
    text: `Hi ${member.first_name}, we'd love to hear about your training experience!${reviewLink ? ` Review us: ${reviewLink}` : ''}`,
  });

  await admin.from('review_requests').insert({
    gym_id: gymId,
    member_id: memberId,
  });
}

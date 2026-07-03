import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { unsubscribeUrl } from '@/lib/unsubscribe';
import { getPublicEnv } from '@/lib/env';

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

/** Map an audience key to the members.status filter it implies (null = no status filter). */
export function audienceStatusFilter(audience: string): string | null {
  if (audience === 'active_members') return 'active';
  if (audience === 'inactive_members') return 'inactive';
  if (audience === 'past_due') return 'past_due';
  return null;
}

/** Dedupe emails and drop empty/opted-out entries. Pure, for unit testing. */
export function dedupeAudience(
  rows: { email: string | null; email_opt_out?: boolean | null }[]
): string[] {
  return [
    ...new Set(
      rows
        .filter((r) => r.email && !r.email_opt_out)
        .map((r) => r.email as string)
    ),
  ];
}

export async function resolveAudienceEmails(
  gymId: string,
  audience: string
): Promise<string[]> {
  const admin = getAdminClient();

  if (audience === 'leads') {
    const { data: leads } = await admin
      .from('leads')
      .select('email, email_opt_out')
      .eq('gym_id', gymId)
      .not('email', 'is', null);
    return dedupeAudience(leads ?? []);
  }

  let query = admin
    .from('members')
    .select('email, email_opt_out')
    .eq('gym_id', gymId)
    .not('email', 'is', null);

  const status = audienceStatusFilter(audience);
  if (status) query = query.eq('status', status);

  const { data } = await query;
  return dedupeAudience(data ?? []);
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

  const { data: gym } = await admin.from('gyms').select('name, contact_email').eq('id', gymId).maybeSingle();
  const gymName = gym?.name ?? 'Gym';
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;

  for (const to of emails) {
    const optOutLink = unsubscribeUrl(appUrl, gymId, to);
    const footer = `
      <hr style="margin-top:24px;border:none;border-top:1px solid #eee" />
      <p style="font-size:12px;color:#666;margin-top:16px">
        You received this email because you are a member or lead of ${gymName}.
        ${gym?.contact_email ? `Contact us at <a href="mailto:${gym.contact_email}">${gym.contact_email}</a>.` : ''}
        <a href="${optOutLink}">Unsubscribe</a>
      </p>
    `;
    try {
      await sendTransactionalEmail({
        to,
        subject: campaign.subject,
        html: `${campaign.body_html}${footer}`,
        text: `${campaign.body_html.replace(/<[^>]+>/g, '')}\n\nYou received this email from ${gymName}. Unsubscribe: ${optOutLink}`,
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

/** Schedule a draft campaign to send at a future time. */
export async function scheduleCampaign(
  gymId: string,
  campaignId: string,
  scheduledAt: string
): Promise<void> {
  if (new Date(scheduledAt).getTime() <= Date.now()) {
    throw new ServiceError(400, 'Scheduled time must be in the future.');
  }

  const admin = getAdminClient();
  const { data: campaign } = await admin
    .from('email_campaigns')
    .select('id, status')
    .eq('id', campaignId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!campaign) throw new ServiceError(404, 'Campaign not found');
  if (campaign.status === 'sent') throw new ServiceError(400, 'Campaign already sent');

  const { error } = await admin
    .from('email_campaigns')
    .update({ status: 'scheduled', scheduled_at: scheduledAt })
    .eq('id', campaignId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

/** Cancel a scheduled campaign back to draft. */
export async function cancelScheduledCampaign(gymId: string, campaignId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('email_campaigns')
    .update({ status: 'draft', scheduled_at: null })
    .eq('id', campaignId)
    .eq('gym_id', gymId)
    .eq('status', 'scheduled');

  if (error) throw new ServiceError(500, error.message);
}

/** Send all scheduled campaigns that are due (called from cron). */
export async function sendDueCampaigns(): Promise<{ processed: number }> {
  const admin = getAdminClient();
  const { data: due } = await admin
    .from('email_campaigns')
    .select('id, gym_id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(20);

  let processed = 0;
  for (const campaign of due ?? []) {
    try {
      await sendCampaign(campaign.gym_id, campaign.id);
      processed++;
    } catch {
      // Leave failed campaigns scheduled; next cron run retries.
    }
  }
  return { processed };
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

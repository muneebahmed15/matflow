import { getAdminClient } from '@/lib/supabase/admin';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { canSendMarketingEmail } from '@/lib/marketing-consent';
import { getPublicEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

const INACTIVE_DAYS = 30;
const RESEND_COOLDOWN_DAYS = 60;

async function logMemberAutomation(input: {
  gymId: string;
  memberId: string;
  workflow: string;
  step: string;
  channel: 'email' | 'sms';
  status: 'sent' | 'failed' | 'skipped';
}): Promise<void> {
  const admin = getAdminClient();
  await admin.from('member_automation_logs').insert({
    gym_id: input.gymId,
    member_id: input.memberId,
    workflow: input.workflow,
    step: input.step,
    channel: input.channel,
    status: input.status,
  });
}

/** Email members with no check-in in 30+ days (once per 60 days). */
export async function sendInactiveMemberWinBack(): Promise<{ processed: number }> {
  const admin = getAdminClient();
  const inactiveCutoff = new Date();
  inactiveCutoff.setDate(inactiveCutoff.getDate() - INACTIVE_DAYS);
  const resendCutoff = new Date();
  resendCutoff.setDate(resendCutoff.getDate() - RESEND_COOLDOWN_DAYS);

  const { data: gyms } = await admin.from('gyms').select('id, name, slug');
  let processed = 0;

  for (const gym of gyms ?? []) {
    const { data: members } = await admin
      .from('members')
      .select('id, first_name, email, email_opt_out, marketing_email_consent, created_at')
      .eq('gym_id', gym.id)
      .eq('status', 'active')
      .not('email', 'is', null)
      .eq('email_opt_out', false)
      .eq('marketing_email_consent', true)
      .limit(200);

    for (const member of members ?? []) {
      if (!member.email) continue;
      if (
        !canSendMarketingEmail({
          email_opt_out: member.email_opt_out,
          marketing_email_consent: member.marketing_email_consent,
        })
      ) {
        continue;
      }

      const { data: lastAttendance } = await admin
        .from('attendance')
        .select('checked_in_at')
        .eq('member_id', member.id)
        .eq('gym_id', gym.id)
        .order('checked_in_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastActivity = lastAttendance?.checked_in_at
        ? new Date(lastAttendance.checked_in_at)
        : new Date(member.created_at);
      if (lastActivity > inactiveCutoff) continue;

      const { data: recentSend } = await admin
        .from('member_automation_logs')
        .select('id')
        .eq('member_id', member.id)
        .eq('workflow', 'win_back_30d')
        .gte('created_at', resendCutoff.toISOString())
        .limit(1)
        .maybeSingle();
      if (recentSend) continue;

      const portalUrl = `${getPublicEnv().NEXT_PUBLIC_APP_URL}/portal/classes`;

      try {
        await sendTransactionalEmail({
          to: member.email,
          subject: `We miss you at ${gym.name}`,
          html: `
            <p>Hi ${member.first_name},</p>
            <p>It has been a while since we have seen you on the mats at <strong>${gym.name}</strong>.</p>
            <p>Your spot is still here — come back this week and pick up where you left off.</p>
            <p><a href="${portalUrl}">View your class schedule</a></p>
          `.trim(),
          text: `Hi ${member.first_name}, we miss you at ${gym.name}. Come back this week! ${portalUrl}`,
        });
        await logMemberAutomation({
          gymId: gym.id,
          memberId: member.id,
          workflow: 'win_back_30d',
          step: 'email',
          channel: 'email',
          status: 'sent',
        });
        processed++;
      } catch (err) {
        logger.warn({ err, memberId: member.id }, 'Win-back email failed');
        await logMemberAutomation({
          gymId: gym.id,
          memberId: member.id,
          workflow: 'win_back_30d',
          step: 'email',
          channel: 'email',
          status: 'failed',
        });
      }
    }
  }

  return { processed };
}

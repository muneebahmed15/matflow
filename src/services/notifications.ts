import { getAdminClient } from '@/lib/supabase/admin';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { ServiceError } from '@/services/errors';

export type NotificationType =
  | 'welcome'
  | 'checkin'
  | 'waiver_signed'
  | 'subscription_created'
  | 'belt_promotion';

function getSubject(type: NotificationType, gymName?: string | null): string {
  switch (type) {
    case 'welcome':
      return `Welcome to ${gymName}!`;
    case 'checkin':
      return `Check-in confirmed at ${gymName}`;
    case 'waiver_signed':
      return `Waiver signed - ${gymName}`;
    case 'subscription_created':
      return `Subscription activated - ${gymName}`;
    case 'belt_promotion':
      return `Congratulations on your promotion! - ${gymName}`;
    default:
      return `Notification from ${gymName}`;
  }
}

function getBody(
  type: NotificationType,
  firstName: string,
  gymName: string | null | undefined,
  data: Record<string, unknown> | null | undefined
): string {
  switch (type) {
    case 'welcome':
      return `Hi ${firstName}, welcome to ${gymName}! We're excited to have you train with us.`;
    case 'checkin':
      return `Hi ${firstName}, your check-in at ${gymName} has been recorded on ${new Date().toLocaleDateString()}.`;
    case 'waiver_signed':
      return `Hi ${firstName}, your waiver has been successfully signed at ${gymName}.`;
    case 'subscription_created':
      return `Hi ${firstName}, your membership subscription at ${gymName} is now active. Plan: ${data?.plan_name ?? 'membership'}.`;
    case 'belt_promotion':
      return `Hi ${firstName}, congratulations on your promotion to ${data?.to_belt} belt at ${gymName}!`;
    default:
      return `Hi ${firstName}, you have a notification from ${gymName}.`;
  }
}

export async function sendMemberNotification(input: {
  gymId: string;
  memberId: string;
  type: NotificationType;
  data?: Record<string, unknown>;
}): Promise<{ notificationId: string; emailSent: boolean }> {
  const admin = getAdminClient();

  const { data: member, error: memberError } = await admin
    .from('members')
    .select('first_name, last_name, email')
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId)
    .single();

  if (memberError || !member) {
    throw new ServiceError(404, 'Member not found');
  }

  const { data: gym } = await admin
    .from('gyms')
    .select('name')
    .eq('id', input.gymId)
    .single();

  const subject = getSubject(input.type, gym?.name);
  const body = getBody(input.type, member.first_name, gym?.name, input.data ?? null);

  const { data: notification, error: insertError } = await admin
    .from('notifications')
    .insert({
      gym_id: input.gymId,
      member_id: input.memberId,
      type: input.type,
      subject,
      body,
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError) throw new ServiceError(500, insertError.message);

  let emailSent = false;
  if (member.email) {
    await sendTransactionalEmail({
      to: member.email,
      subject,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
    });
    emailSent = true;
  }

  return { notificationId: notification.id, emailSent };
}

import { getAdminClient } from '@/lib/supabase/admin';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { ServiceError } from '@/services/errors';
import { logger } from '@/lib/logger';

const DUNNING_SUBJECTS = [
  'Payment reminder — action needed',
  'Second notice: update your payment method',
  'Final reminder before membership suspension',
];

export async function processPaymentFailedDunning(input: {
  gymId: string;
  memberId: string;
  subscriptionId: string | null;
}): Promise<{ reminderNumber: number; sent: boolean }> {
  const admin = getAdminClient();

  const { count } = await admin
    .from('dunning_reminders')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', input.memberId)
    .eq('subscription_id', input.subscriptionId);

  const prior = count ?? 0;
  if (prior >= 3) {
    return { reminderNumber: 3, sent: false };
  }

  const reminderNumber = prior + 1;

  const [{ data: member }, { data: gym }] = await Promise.all([
    admin
      .from('members')
      .select('email, first_name')
      .eq('id', input.memberId)
      .single(),
    admin.from('gyms').select('name').eq('id', input.gymId).single(),
  ]);

  let sent = false;
  if (member?.email) {
    const gymName = gym?.name ?? 'your gym';
    const subject = DUNNING_SUBJECTS[reminderNumber - 1] ?? DUNNING_SUBJECTS[0];
    const html = `<p>Hi ${member.first_name},</p>
<p>We were unable to process your membership payment at ${gymName}.</p>
<p>Please update your payment method in the member portal to keep your membership active.</p>
<p>This is reminder ${reminderNumber} of 3.</p>`;

    try {
      await sendTransactionalEmail({
        to: member.email,
        subject,
        html,
        text: html.replace(/<[^>]+>/g, ''),
      });
      sent = true;
    } catch (err) {
      logger.warn({ err, memberId: input.memberId }, 'Dunning email failed');
    }
  }

  const { error } = await admin.from('dunning_reminders').insert({
    gym_id: input.gymId,
    member_id: input.memberId,
    subscription_id: input.subscriptionId,
    reminder_number: reminderNumber,
    channel: 'email',
  });

  if (error && error.code !== '23505') {
    throw new ServiceError(500, error.message);
  }

  return { reminderNumber, sent };
}

import { getAdminClient } from '@/lib/supabase/admin';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { ServiceError } from '@/services/errors';

export async function recordAiUsage(input: {
  gymId: string;
  channel: string;
  quantity?: number;
}): Promise<void> {
  const admin = getAdminClient();
  await admin.from('ai_usage_events').insert({
    gym_id: input.gymId,
    channel: input.channel,
    quantity: input.quantity ?? 1,
  });
}

export async function getMonthlyAiUsage(gymId: string): Promise<number> {
  const admin = getAdminClient();
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { count } = await admin
    .from('ai_usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .gte('created_at', start.toISOString());

  return count ?? 0;
}

export async function assertAiUsageWithinLimit(gymId: string): Promise<void> {
  const admin = getAdminClient();
  const { data: gym } = await admin
    .from('gyms')
    .select('ai_monthly_message_limit, name, contact_email, owner_id')
    .eq('id', gymId)
    .maybeSingle();

  const limit = gym?.ai_monthly_message_limit ?? 1000;
  const used = await getMonthlyAiUsage(gymId);
  if (used < limit) return;

  throw new ServiceError(429, 'AI message limit reached for this month. Contact support to increase your plan.');
}

export async function checkAndAlertAiOverage(gymId: string): Promise<boolean> {
  const admin = getAdminClient();
  const { data: gym } = await admin
    .from('gyms')
    .select('ai_monthly_message_limit, name, contact_email, owner_id')
    .eq('id', gymId)
    .maybeSingle();

  const limit = gym?.ai_monthly_message_limit ?? 1000;
  const used = await getMonthlyAiUsage(gymId);
  if (used < limit * 0.9) return false;

  const { data: owner } = gym?.owner_id
    ? await admin.auth.admin.getUserById(gym.owner_id)
    : { data: null };

  const to = gym?.contact_email ?? owner?.user?.email;
  if (!to) return true;

  await sendTransactionalEmail({
    to,
    subject: `${gym?.name ?? 'Gym'} — AI usage at ${Math.round((used / limit) * 100)}%`,
    html: `<p>Your gym has used ${used} of ${limit} AI messages this month.</p>`,
    text: `AI usage: ${used}/${limit} messages this month.`,
  }).catch(() => undefined);

  return true;
}

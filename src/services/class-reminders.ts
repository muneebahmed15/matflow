import { getAdminClient } from '@/lib/supabase/admin';
import { isClassInReminderWindow, getGymLocalClock } from '@/lib/class-reminder-window';
import { formatClassTime } from '@/lib/gym-public-time';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { getPublicEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

async function alreadySentReminder(
  memberId: string,
  classId: string,
  dateKey: string
): Promise<boolean> {
  const admin = getAdminClient();
  const step = `${dateKey}:${classId}`;
  const { data } = await admin
    .from('member_automation_logs')
    .select('id')
    .eq('member_id', memberId)
    .eq('workflow', 'class_reminder')
    .eq('step', step)
    .eq('status', 'sent')
    .maybeSingle();
  return Boolean(data);
}

async function logReminder(input: {
  gymId: string;
  memberId: string;
  classId: string;
  dateKey: string;
  status: 'sent' | 'failed' | 'skipped';
}): Promise<void> {
  const admin = getAdminClient();
  await admin.from('member_automation_logs').insert({
    gym_id: input.gymId,
    member_id: input.memberId,
    workflow: 'class_reminder',
    step: `${input.dateKey}:${input.classId}`,
    channel: 'email',
    status: input.status,
  });
}

/** Email enrolled members and drop-in bookers before class starts. */
export async function sendClassReminders(): Promise<{ processed: number }> {
  const admin = getAdminClient();
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  let processed = 0;

  const { data: gyms } = await admin
    .from('gyms')
    .select('id, name, slug, timezone, class_reminder_hours');

  for (const gym of gyms ?? []) {
    if ((gym.class_reminder_hours ?? 0) <= 0) continue;

    const timezone = gym.timezone ?? 'America/Los_Angeles';
    const local = getGymLocalClock(timezone);
    const reminderHours = gym.class_reminder_hours ?? 2;

    const { data: classes } = await admin
      .from('classes')
      .select('id, name, day_of_week, start_time, end_time, instructor')
      .eq('gym_id', gym.id)
      .eq('is_active', true);

    const dueClasses = (classes ?? []).filter((c) =>
      isClassInReminderWindow({
        dayOfWeek: c.day_of_week,
        startTime: c.start_time,
        timezone,
        reminderHours,
      })
    );

    if (dueClasses.length === 0) continue;

    const { data: cancelled } = await admin
      .from('class_schedule_exceptions')
      .select('class_id')
      .eq('gym_id', gym.id)
      .eq('exception_date', local.dateKey);

    const cancelledIds = new Set((cancelled ?? []).map((c) => c.class_id));

    for (const gymClass of dueClasses.filter((c) => !cancelledIds.has(c.id))) {
      const memberIds = new Set<string>();

      const { data: enrollments } = await admin
        .from('class_enrollments')
        .select('member_id')
        .eq('gym_id', gym.id)
        .eq('class_id', gymClass.id)
        .eq('status', 'active');

      for (const row of enrollments ?? []) {
        memberIds.add(row.member_id);
      }

      const { data: session } = await admin
        .from('class_sessions')
        .select('id')
        .eq('gym_id', gym.id)
        .eq('class_id', gymClass.id)
        .eq('session_date', local.dateKey)
        .maybeSingle();

      if (session) {
        const { data: bookings } = await admin
          .from('class_session_bookings')
          .select('member_id')
          .eq('session_id', session.id)
          .eq('status', 'booked');

        for (const row of bookings ?? []) {
          memberIds.add(row.member_id);
        }
      }

      if (memberIds.size === 0) continue;

      const { data: members } = await admin
        .from('members')
        .select('id, first_name, email, status')
        .eq('gym_id', gym.id)
        .in('id', [...memberIds])
        .eq('status', 'active')
        .not('email', 'is', null);

      const startLabel = formatClassTime(gymClass.start_time, timezone);
      const endLabel = formatClassTime(gymClass.end_time, timezone);

      for (const member of members ?? []) {
        if (!member.email) continue;
        if (await alreadySentReminder(member.id, gymClass.id, local.dateKey)) continue;

        try {
          await sendTransactionalEmail({
            to: member.email,
            subject: `Reminder: ${gymClass.name} starts in ${reminderHours} hour${reminderHours === 1 ? '' : 's'}`,
            html: `<p>Hi ${member.first_name},</p>
<p>This is a reminder that <strong>${gymClass.name}</strong> at <strong>${gym.name}</strong> starts today at ${startLabel}${endLabel ? ` – ${endLabel}` : ''}.</p>
${gymClass.instructor ? `<p>Instructor: ${gymClass.instructor}</p>` : ''}
<p><a href="${appUrl}/portal/classes">View your classes</a></p>`,
            text: `Reminder: ${gymClass.name} at ${gym.name} starts today at ${startLabel}.`,
          });
          await logReminder({
            gymId: gym.id,
            memberId: member.id,
            classId: gymClass.id,
            dateKey: local.dateKey,
            status: 'sent',
          });
          processed++;
        } catch (err) {
          logger.warn({ err, memberId: member.id, classId: gymClass.id }, 'Class reminder email failed');
          await logReminder({
            gymId: gym.id,
            memberId: member.id,
            classId: gymClass.id,
            dateKey: local.dateKey,
            status: 'failed',
          });
        }
      }
    }
  }

  return { processed };
}

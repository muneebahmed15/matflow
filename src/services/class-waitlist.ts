import { getAdminClient } from '@/lib/supabase/admin';
import { getPublicEnv } from '@/lib/env';
import { sendTransactionalEmail, waitlistPromotedEmail } from '@/lib/email/resend';
import { ServiceError } from '@/services/errors';

export type ClassWaitlistEntry = {
  id: string;
  gym_id: string;
  class_id: string;
  member_id: string;
  position: number;
  status: string;
  created_at: string;
  members?: { first_name: string; last_name: string; email: string | null } | null;
};

export async function listClassWaitlist(
  gymId: string,
  classId: string
): Promise<ClassWaitlistEntry[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('class_waitlist')
    .select('*, members(first_name, last_name, email)')
    .eq('gym_id', gymId)
    .eq('class_id', classId)
    .eq('status', 'waiting')
    .order('position', { ascending: true });

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as ClassWaitlistEntry[];
}

export async function addMemberToWaitlist(input: {
  gymId: string;
  classId: string;
  memberId: string;
}): Promise<ClassWaitlistEntry> {
  const admin = getAdminClient();

  const { data: gymClass } = await admin
    .from('classes')
    .select('id')
    .eq('id', input.classId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (!gymClass) throw new ServiceError(404, 'Class not found.');

  const { data: member } = await admin
    .from('members')
    .select('id')
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (!member) throw new ServiceError(404, 'Member not found.');

  const { data: existing } = await admin
    .from('class_waitlist')
    .select('id, status')
    .eq('class_id', input.classId)
    .eq('member_id', input.memberId)
    .maybeSingle();

  if (existing && existing.status === 'waiting') {
    throw new ServiceError(409, 'Member is already on the waitlist.');
  }

  const { data: last } = await admin
    .from('class_waitlist')
    .select('position')
    .eq('class_id', input.classId)
    .eq('status', 'waiting')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (last?.position ?? 0) + 1;

  const { data, error } = await admin
    .from('class_waitlist')
    .upsert(
      {
        gym_id: input.gymId,
        class_id: input.classId,
        member_id: input.memberId,
        position,
        status: 'waiting',
      },
      { onConflict: 'class_id,member_id' }
    )
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as ClassWaitlistEntry;
}

export async function removeFromWaitlist(
  gymId: string,
  waitlistId: string
): Promise<void> {
  const admin = getAdminClient();

  const { data: entry } = await admin
    .from('class_waitlist')
    .select('class_id')
    .eq('id', waitlistId)
    .eq('gym_id', gymId)
    .maybeSingle();

  const { error } = await admin
    .from('class_waitlist')
    .update({ status: 'cancelled' })
    .eq('id', waitlistId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);

  if (entry?.class_id) {
    await promoteNextFromWaitlist(gymId, entry.class_id);
  }
}

/** Notify the next waiting member when a spot opens (best-effort). */
export async function promoteNextFromWaitlist(
  gymId: string,
  classId: string
): Promise<ClassWaitlistEntry | null> {
  const admin = getAdminClient();
  const { data: next } = await admin
    .from('class_waitlist')
    .select('*, members(first_name, last_name, email), classes(name, day_of_week)')
    .eq('gym_id', gymId)
    .eq('class_id', classId)
    .eq('status', 'waiting')
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!next?.members?.email) return null;

  const now = new Date().toISOString();
  await admin
    .from('class_waitlist')
    .update({ status: 'promoted', promoted_at: now, notified_at: now })
    .eq('id', next.id);

  try {
    const { NEXT_PUBLIC_APP_URL } = getPublicEnv();
    const memberName =
      `${next.members.first_name ?? ''} ${next.members.last_name ?? ''}`.trim() || 'Member';
    const template = waitlistPromotedEmail({
      memberName,
      className: next.classes?.name ?? 'class',
      dayOfWeek: next.classes?.day_of_week ?? null,
      portalUrl: `${NEXT_PUBLIC_APP_URL}/portal/classes`,
    });
    await sendTransactionalEmail({ ...template, to: next.members.email });
  } catch {
    // best-effort email
  }

  return next as ClassWaitlistEntry;
}

export async function listMemberWaitlist(
  gymId: string,
  memberId: string
): Promise<(ClassWaitlistEntry & { classes: { name: string; day_of_week: string | null } | null })[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('class_waitlist')
    .select('*, classes(name, day_of_week)')
    .eq('gym_id', gymId)
    .eq('member_id', memberId)
    .eq('status', 'waiting')
    .order('position');

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as (ClassWaitlistEntry & {
    classes: { name: string; day_of_week: string | null } | null;
  })[];
}

export async function cancelMemberWaitlistByClass(
  gymId: string,
  classId: string,
  memberId: string
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('class_waitlist')
    .update({ status: 'cancelled' })
    .eq('gym_id', gymId)
    .eq('class_id', classId)
    .eq('member_id', memberId)
    .eq('status', 'waiting');

  if (error) throw new ServiceError(500, error.message);

  await promoteNextFromWaitlist(gymId, classId);
}

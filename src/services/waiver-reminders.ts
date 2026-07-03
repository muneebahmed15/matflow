import { getAdminClient } from '@/lib/supabase/admin';
import { getPublicEnv } from '@/lib/env';
import { sendTransactionalEmail, memberWaiverLinkEmail, waiverExpiryReminderEmail } from '@/lib/email/resend';
import { ServiceError } from '@/services/errors';

export type ExpiringWaiverNotice = {
  signatureId: string;
  memberId: string;
  memberEmail: string;
  memberFirstName: string;
  memberLastName: string;
  gymId: string;
  gymName: string;
  waiverId: string;
  waiverTitle: string;
  expiresAt: string;
};

type SignatureRow = {
  id: string;
  member_id: string;
  waiver_id: string;
  expires_at: string;
  members: {
    id: string;
    gym_id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    status: string;
  } | null;
  waivers: { id: string; title: string; is_active: boolean } | null;
};

function normalizeSignatureRow(row: Record<string, unknown>): SignatureRow | null {
  const members = Array.isArray(row.members) ? row.members[0] : row.members;
  const waivers = Array.isArray(row.waivers) ? row.waivers[0] : row.waivers;
  if (!members || !waivers) return null;

  return {
    id: String(row.id),
    member_id: String(row.member_id),
    waiver_id: String(row.waiver_id),
    expires_at: String(row.expires_at),
    members: members as SignatureRow['members'],
    waivers: waivers as SignatureRow['waivers'],
  };
}

export function collectExpiringWaiverNotices(
  rows: SignatureRow[],
  options?: { now?: Date; withinDays?: number }
): ExpiringWaiverNotice[] {
  const now = options?.now ?? new Date();
  const withinDays = options?.withinDays ?? 7;
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + withinDays);

  const notices: ExpiringWaiverNotice[] = [];

  for (const row of rows) {
    if (!row.expires_at || !row.members || !row.waivers) continue;
    if (row.members.status !== 'active' || !row.waivers.is_active) continue;
    if (!row.members.email?.trim()) continue;

    const expiresAt = new Date(row.expires_at);
    if (expiresAt <= now || expiresAt > windowEnd) continue;

    notices.push({
      signatureId: row.id,
      memberId: row.members.id,
      memberEmail: row.members.email.trim(),
      memberFirstName: row.members.first_name,
      memberLastName: row.members.last_name,
      gymId: row.members.gym_id,
      gymName: '',
      waiverId: row.waivers.id,
      waiverTitle: row.waivers.title,
      expiresAt: row.expires_at,
    });
  }

  return notices;
}

export async function listExpiringWaiverNotices(withinDays = 7): Promise<ExpiringWaiverNotice[]> {
  const admin = getAdminClient();
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + withinDays);

  const { data, error } = await admin
    .from('waiver_signatures')
    .select(
      'id, member_id, waiver_id, expires_at, members(id, gym_id, first_name, last_name, email, status), waivers(id, title, is_active)'
    )
    .not('expires_at', 'is', null)
    .gt('expires_at', now.toISOString())
    .lte('expires_at', windowEnd.toISOString());

  if (error) throw new ServiceError(500, error.message);

  const rows = (data ?? [])
    .map((row) => normalizeSignatureRow(row as Record<string, unknown>))
    .filter((row): row is SignatureRow => row !== null);

  const notices = collectExpiringWaiverNotices(rows, { now, withinDays });
  if (notices.length === 0) return [];

  const gymIds = [...new Set(notices.map((n) => n.gymId))];
  const { data: gyms } = await admin.from('gyms').select('id, name').in('id', gymIds);
  const gymNames = new Map((gyms ?? []).map((g) => [g.id, g.name]));

  return notices.map((n) => ({ ...n, gymName: gymNames.get(n.gymId) ?? 'your gym' }));
}

async function wasReminderSentRecently(
  memberId: string,
  waiverId: string,
  withinDays = 7
): Promise<boolean> {
  const admin = getAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - withinDays);

  const { data } = await admin
    .from('notifications')
    .select('id')
    .eq('member_id', memberId)
    .eq('type', 'waiver_expiry_reminder')
    .gte('sent_at', since.toISOString())
    .ilike('body', `%${waiverId}%`)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

export async function sendWaiverExpiryReminder(notice: ExpiringWaiverNotice): Promise<boolean> {
  if (await wasReminderSentRecently(notice.memberId, notice.waiverId)) {
    return false;
  }

  const { NEXT_PUBLIC_APP_URL } = getPublicEnv();
  const portalUrl = `${NEXT_PUBLIC_APP_URL}/portal/waivers`;
  const fullName = `${notice.memberFirstName} ${notice.memberLastName}`.trim();
  const expiresLabel = new Date(notice.expiresAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const template = waiverExpiryReminderEmail({
    fullName,
    gymName: notice.gymName,
    waiverTitle: notice.waiverTitle,
    expiresLabel,
    portalUrl,
  });

  await sendTransactionalEmail({ ...template, to: notice.memberEmail });

  const admin = getAdminClient();
  await admin.from('notifications').insert({
    gym_id: notice.gymId,
    member_id: notice.memberId,
    type: 'waiver_expiry_reminder',
    subject: template.subject,
    body: `${notice.waiverId}\n${template.text ?? ''}`,
    sent_at: new Date().toISOString(),
  });

  return true;
}

export async function processWaiverExpiryReminders(options?: {
  withinDays?: number;
}): Promise<{ scanned: number; sent: number; skipped: number }> {
  const notices = await listExpiringWaiverNotices(options?.withinDays ?? 7);
  let sent = 0;
  let skipped = 0;

  for (const notice of notices) {
    const didSend = await sendWaiverExpiryReminder(notice);
    if (didSend) sent++;
    else skipped++;
  }

  return { scanned: notices.length, sent, skipped };
}

export async function sendWaiverLinkToMember(input: {
  gymId: string;
  memberId: string;
}): Promise<void> {
  const admin = getAdminClient();
  const { NEXT_PUBLIC_APP_URL } = getPublicEnv();

  const { data: member, error: memberErr } = await admin
    .from('members')
    .select('id, email, first_name, last_name, gym_id')
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (memberErr) throw new ServiceError(500, memberErr.message);
  if (!member?.email?.trim()) {
    throw new ServiceError(400, 'Member must have an email to receive a waiver link.');
  }

  const { data: gym } = await admin
    .from('gyms')
    .select('name')
    .eq('id', input.gymId)
    .maybeSingle();

  const portalUrl = `${NEXT_PUBLIC_APP_URL}/portal/waivers`;
  const fullName = `${member.first_name} ${member.last_name}`.trim();
  const template = memberWaiverLinkEmail({
    fullName,
    gymName: gym?.name ?? 'your gym',
    portalUrl,
  });

  await sendTransactionalEmail({ ...template, to: member.email.trim() });

  await admin.from('notifications').insert({
    gym_id: input.gymId,
    member_id: input.memberId,
    type: 'waiver_link',
    subject: template.subject,
    body: template.text ?? template.subject,
    sent_at: new Date().toISOString(),
  });
}

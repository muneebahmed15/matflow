import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import { ServiceError } from '@/services/errors';

type WaiverRow = Database['public']['Tables']['waivers']['Row'];

export type Waiver = WaiverRow;

export async function listWaivers(gymId: string): Promise<Waiver[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('waivers')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export async function getWaiver(gymId: string, waiverId: string): Promise<Waiver> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('waivers')
    .select('*')
    .eq('id', waiverId)
    .eq('gym_id', gymId)
    .single();

  if (error || !data) throw new ServiceError(404, 'Waiver not found');
  return data;
}

export async function createWaiver(input: {
  gymId: string;
  title: string;
  body: string;
  expiresAfterDays?: number | null;
}): Promise<WaiverRow> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('waivers')
    .insert({
      gym_id: input.gymId,
      title: input.title.trim(),
      body: input.body.trim(),
      expires_after_days: input.expiresAfterDays ?? null,
    })
    .select()
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data;
}

/**
 * Update a waiver's content. Bumps the version so existing signatures become
 * stale and members must re-sign (6.6 / 6.8), and audit-logs the edit (6.51).
 */
export async function updateWaiver(input: {
  gymId: string;
  waiverId: string;
  title: string;
  body: string;
  expiresAfterDays?: number | null;
  actorId?: string | null;
}): Promise<WaiverRow> {
  const admin = getAdminClient();

  const { data: current } = await admin
    .from('waivers')
    .select('id, version, title, body')
    .eq('id', input.waiverId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (!current) throw new ServiceError(404, 'Waiver not found');

  const contentChanged =
    current.title !== input.title.trim() || current.body !== input.body.trim();
  const nextVersion = contentChanged
    ? ((current as { version?: number }).version ?? 1) + 1
    : ((current as { version?: number }).version ?? 1);

  const { data, error } = await admin
    .from('waivers')
    .update({
      title: input.title.trim(),
      body: input.body.trim(),
      expires_after_days: input.expiresAfterDays ?? null,
      version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.waiverId)
    .eq('gym_id', input.gymId)
    .select()
    .single();

  if (error) throw new ServiceError(500, error.message);

  try {
    const { logAuditEvent } = await import('@/services/audit');
    await logAuditEvent({
      gymId: input.gymId,
      actorId: input.actorId ?? null,
      action: contentChanged ? 'waiver.updated_new_version' : 'waiver.updated',
      entityType: 'waiver',
      entityId: input.waiverId,
      payload: { version: nextVersion },
    });
  } catch {
    // Audit is best-effort
  }

  return data;
}

export async function toggleWaiverStatus(
  gymId: string,
  waiverId: string,
  isActive: boolean
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('waivers')
    .update({ is_active: isActive })
    .eq('id', waiverId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

export async function getWaiverSignatures(waiverId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('waiver_signatures')
    .select('*, members(first_name, last_name, email), leads(first_name, last_name, email)')
    .eq('waiver_id', waiverId)
    .order('signed_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export async function listActiveWaiversForGym(gymId: string): Promise<Waiver[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('waivers')
    .select('*')
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

export async function getLeadWaiverSignatures(leadId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('waiver_signatures')
    .select('*, waivers(title, version)')
    .eq('lead_id', leadId)
    .order('signed_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

type LatestSignatureRow = {
  id: string;
  expires_at: string | null;
  waiver_version: number;
  signed_at: string;
};

async function getLatestValidSignature(
  admin: ReturnType<typeof getAdminClient>,
  filter: { waiverId: string; memberId?: string; leadId?: string }
): Promise<LatestSignatureRow | null> {
  let query = admin
    .from('waiver_signatures')
    .select('id, expires_at, waiver_version, signed_at')
    .eq('waiver_id', filter.waiverId)
    .order('signed_at', { ascending: false })
    .limit(1);

  if (filter.memberId) query = query.eq('member_id', filter.memberId);
  if (filter.leadId) query = query.eq('lead_id', filter.leadId);

  const { data } = await query.maybeSingle();
  return data as LatestSignatureRow | null;
}

export async function getMemberWaiverSignatures(memberId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('waiver_signatures')
    .select('*, waivers(title)')
    .eq('member_id', memberId)
    .order('signed_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

function waiverExpiresAt(expiresAfterDays: number | null): string | null {
  if (!expiresAfterDays || expiresAfterDays <= 0) return null;
  const expires = new Date();
  expires.setDate(expires.getDate() + expiresAfterDays);
  return expires.toISOString();
}

function isSignatureStillValid(
  sig: LatestSignatureRow | null,
  waiverVersion: number,
  now = new Date()
): boolean {
  if (!sig) return false;
  const notExpired = !sig.expires_at || new Date(sig.expires_at) > now;
  const currentVersion = (sig.waiver_version ?? 1) === waiverVersion;
  return notExpired && currentVersion;
}

async function insertImmutableSignature(input: {
  waiverId: string;
  gymId: string;
  memberId?: string;
  leadId?: string;
  signedName: string;
  guardianName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  waiver: { title: string; body: string; expires_after_days?: number | null; version?: number };
  signerEmail?: string | null;
  gymName?: string;
  webhookPayload: Record<string, unknown>;
}): Promise<{ signatureId: string; pdfStoragePath: string | null }> {
  const admin = getAdminClient();
  const waiverVersion = input.waiver.version ?? 1;
  const signedAt = new Date().toISOString();
  const expiresAt = waiverExpiresAt(input.waiver.expires_after_days ?? null);
  const signatureId = crypto.randomUUID();

  let pdfStoragePath: string | null = null;
  try {
    const { buildWaiverPdf } = await import('@/lib/waiver-pdf');
    const pdfBytes = await buildWaiverPdf({
      gymName: input.gymName ?? 'Gym',
      waiverTitle: input.waiver.title,
      waiverBody: input.waiver.body,
      signedName: input.signedName.trim(),
      signedAt,
      memberEmail: input.signerEmail,
    });
    pdfStoragePath = `${input.gymId}/${signatureId}.pdf`;
    await admin.storage.from('waiver-signatures').upload(pdfStoragePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: false,
    });
  } catch {
    pdfStoragePath = null;
  }

  const { error } = await admin.from('waiver_signatures').insert({
    id: signatureId,
    waiver_id: input.waiverId,
    member_id: input.memberId ?? null,
    lead_id: input.leadId ?? null,
    gym_id: input.gymId,
    signed_name: input.signedName.trim(),
    guardian_name: input.guardianName?.trim() || null,
    signed_at: signedAt,
    expires_at: expiresAt,
    waiver_version: waiverVersion,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    pdf_storage_path: pdfStoragePath,
  });

  if (error) throw new ServiceError(500, error.message);

  try {
    const { data: gymHook } = await admin
      .from('gyms')
      .select('signature_webhook_url')
      .eq('id', input.gymId)
      .maybeSingle();

    const webhookUrl = (gymHook as { signature_webhook_url?: string | null })
      ?.signature_webhook_url;
    if (webhookUrl && /^https:\/\//.test(webhookUrl)) {
      void fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'waiver.signature.completed',
          signature_id: signatureId,
          signed_at: signedAt,
          ...input.webhookPayload,
        }),
      }).catch(() => undefined);
    }
  } catch {
    // Webhook is best-effort
  }

  return { signatureId, pdfStoragePath };
}

export async function signWaiver(input: {
  waiverId: string;
  memberId: string;
  gymId: string;
  signedName: string;
  guardianName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ signatureId: string; pdfStoragePath: string | null }> {
  const admin = getAdminClient();

  const { data: waiver } = await admin
    .from('waivers')
    .select('id, title, body, expires_after_days, version')
    .eq('id', input.waiverId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (!waiver) throw new ServiceError(404, 'Waiver not found');

  const waiverVersion = (waiver as { version?: number }).version ?? 1;

  const { data: member } = await admin
    .from('members')
    .select('first_name, last_name, email, date_of_birth')
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  const dob = (member as { date_of_birth?: string | null } | null)?.date_of_birth;
  if (dob) {
    const age = (Date.now() - new Date(dob).getTime()) / (365.25 * 86_400_000);
    if (age < 18 && !input.guardianName?.trim()) {
      throw new ServiceError(
        400,
        'This member is a minor. A parent or guardian must sign — provide the guardian name.'
      );
    }
  }

  const { data: gym } = await admin
    .from('gyms')
    .select('name')
    .eq('id', input.gymId)
    .maybeSingle();

  const existing = await getLatestValidSignature(admin, {
    waiverId: input.waiverId,
    memberId: input.memberId,
  });

  if (isSignatureStillValid(existing, waiverVersion)) {
    throw new ServiceError(409, 'This waiver is already signed and still valid.');
  }

  return insertImmutableSignature({
    waiverId: input.waiverId,
    gymId: input.gymId,
    memberId: input.memberId,
    signedName: input.signedName,
    guardianName: input.guardianName,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    waiver,
    signerEmail: member?.email,
    gymName: gym?.name ?? 'Gym',
    webhookPayload: {
      waiver_id: input.waiverId,
      member_id: input.memberId,
      gym_id: input.gymId,
    },
  });
}

/** Trial / lead waiver signing before conversion to member (6.40). */
export async function signLeadWaiver(input: {
  waiverId: string;
  leadId: string;
  gymId: string;
  signedName: string;
  guardianName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ signatureId: string; pdfStoragePath: string | null }> {
  const admin = getAdminClient();

  const [{ data: waiver }, { data: lead }, { data: gym }] = await Promise.all([
    admin
      .from('waivers')
      .select('id, title, body, expires_after_days, version')
      .eq('id', input.waiverId)
      .eq('gym_id', input.gymId)
      .eq('is_active', true)
      .maybeSingle(),
    admin
      .from('leads')
      .select('id, first_name, last_name, email')
      .eq('id', input.leadId)
      .eq('gym_id', input.gymId)
      .maybeSingle(),
    admin.from('gyms').select('name').eq('id', input.gymId).maybeSingle(),
  ]);

  if (!waiver) throw new ServiceError(404, 'Waiver not found');
  if (!lead) throw new ServiceError(404, 'Lead not found');

  const waiverVersion = (waiver as { version?: number }).version ?? 1;
  const existing = await getLatestValidSignature(admin, {
    waiverId: input.waiverId,
    leadId: input.leadId,
  });

  if (isSignatureStillValid(existing, waiverVersion)) {
    throw new ServiceError(409, 'This waiver is already signed and still valid.');
  }

  return insertImmutableSignature({
    waiverId: input.waiverId,
    gymId: input.gymId,
    leadId: input.leadId,
    signedName: input.signedName,
    guardianName: input.guardianName,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    waiver,
    signerEmail: lead.email,
    gymName: gym?.name ?? 'Gym',
    webhookPayload: {
      waiver_id: input.waiverId,
      lead_id: input.leadId,
      gym_id: input.gymId,
    },
  });
}

/** Copy lead waiver signatures to a new member on conversion. */
export async function transferLeadWaiversToMember(
  gymId: string,
  leadId: string,
  memberId: string
): Promise<void> {
  const admin = getAdminClient();
  const leadSigs = await getLeadWaiverSignatures(leadId);
  if (!leadSigs.length) return;

  const rows = leadSigs.map((sig) => ({
    waiver_id: sig.waiver_id,
    member_id: memberId,
    gym_id: gymId,
    signed_name: sig.signed_name,
    guardian_name: (sig as { guardian_name?: string | null }).guardian_name ?? null,
    signed_at: sig.signed_at,
    expires_at: sig.expires_at,
    waiver_version: (sig as { waiver_version?: number }).waiver_version ?? 1,
    ip_address: (sig as { ip_address?: string | null }).ip_address ?? null,
    user_agent: (sig as { user_agent?: string | null }).user_agent ?? null,
    pdf_storage_path: (sig as { pdf_storage_path?: string | null }).pdf_storage_path ?? null,
  }));

  const { error } = await admin.from('waiver_signatures').insert(rows);
  if (error) throw new ServiceError(500, error.message);
}

export async function assertMemberWaiverCompliance(
  gymId: string,
  memberId: string
): Promise<void> {
  const admin = getAdminClient();

  const { data: gym, error: gymError } = await admin
    .from('gyms')
    .select('require_waiver_for_checkin')
    .eq('id', gymId)
    .maybeSingle();

  if (gymError) throw new ServiceError(500, gymError.message);
  if (gym?.require_waiver_for_checkin === false) return;

  const { data: activeWaivers, error: waiverError } = await admin
    .from('waivers')
    .select('id, title, version')
    .eq('gym_id', gymId)
    .eq('is_active', true);

  if (waiverError) throw new ServiceError(500, waiverError.message);
  if (!activeWaivers?.length) return;

  const versionByWaiver = new Map(
    activeWaivers.map((w) => [w.id, (w as { version?: number }).version ?? 1])
  );

  const waiverIds = activeWaivers.map((w) => w.id);
  const { data: signatures, error: sigError } = await admin
    .from('waiver_signatures')
    .select('waiver_id, expires_at, signed_at, waiver_version')
    .eq('member_id', memberId)
    .in('waiver_id', waiverIds);

  if (sigError) throw new ServiceError(500, sigError.message);

  const now = new Date();
  const latestByWaiver = new Map<string, (typeof signatures)[number]>();
  for (const sig of signatures ?? []) {
    const prev = latestByWaiver.get(sig.waiver_id);
    if (!prev || new Date(sig.signed_at) > new Date(prev.signed_at)) {
      latestByWaiver.set(sig.waiver_id, sig);
    }
  }

  const validSigned = new Set(
    [...latestByWaiver.values()]
      .filter((s) => {
        const notExpired = !s.expires_at || new Date(s.expires_at) > now;
        const sigVersion = (s as { waiver_version?: number }).waiver_version ?? 1;
        return notExpired && sigVersion === versionByWaiver.get(s.waiver_id);
      })
      .map((s) => s.waiver_id)
  );

  const missing = activeWaivers.filter((w) => !validSigned.has(w.id));
  if (missing.length > 0) {
    const label = missing.length === 1 ? missing[0].title : `${missing.length} waivers`;
    throw new ServiceError(
      403,
      `Waiver signature required: ${label} must be signed before check-in.`
    );
  }
}

export type WaiverGapIssue = {
  waiverId: string;
  title: string;
  status: 'missing' | 'expired';
};

export type MemberWaiverGap = {
  memberId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  issues: WaiverGapIssue[];
};

type SignatureRow = {
  member_id: string;
  waiver_id: string;
  expires_at: string | null;
  signed_at: string;
};

export function computeMemberWaiverGaps(
  activeWaivers: { id: string; title: string }[],
  signatures: SignatureRow[],
  members: { id: string; first_name: string; last_name: string; email: string | null }[],
  now: Date = new Date()
): MemberWaiverGap[] {
  if (!activeWaivers.length) return [];

  const latestByMemberWaiver = new Map<string, SignatureRow>();
  for (const sig of signatures) {
    const key = `${sig.member_id}:${sig.waiver_id}`;
    const existing = latestByMemberWaiver.get(key);
    if (!existing || new Date(sig.signed_at) > new Date(existing.signed_at)) {
      latestByMemberWaiver.set(key, sig);
    }
  }

  const gaps: MemberWaiverGap[] = [];

  for (const member of members) {
    const issues: WaiverGapIssue[] = [];
    for (const waiver of activeWaivers) {
      const sig = latestByMemberWaiver.get(`${member.id}:${waiver.id}`);
      if (!sig) {
        issues.push({ waiverId: waiver.id, title: waiver.title, status: 'missing' });
        continue;
      }
      if (sig.expires_at && new Date(sig.expires_at) <= now) {
        issues.push({ waiverId: waiver.id, title: waiver.title, status: 'expired' });
      }
    }
    if (issues.length > 0) {
      gaps.push({
        memberId: member.id,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        issues,
      });
    }
  }

  return gaps.sort((a, b) => {
    const diff = b.issues.length - a.issues.length;
    if (diff !== 0) return diff;
    return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`);
  });
}

export async function listMembersWithWaiverGaps(gymId: string): Promise<MemberWaiverGap[]> {
  const admin = getAdminClient();

  const [{ data: activeWaivers, error: waiverError }, { data: members, error: memberError }] =
    await Promise.all([
      admin.from('waivers').select('id, title').eq('gym_id', gymId).eq('is_active', true),
      admin
        .from('members')
        .select('id, first_name, last_name, email')
        .eq('gym_id', gymId)
        .eq('status', 'active'),
    ]);

  if (waiverError) throw new ServiceError(500, waiverError.message);
  if (memberError) throw new ServiceError(500, memberError.message);
  if (!activeWaivers?.length || !members?.length) return [];

  const waiverIds = activeWaivers.map((w) => w.id);
  const memberIds = members.map((m) => m.id);

  const { data: signatures, error: sigError } = await admin
    .from('waiver_signatures')
    .select('member_id, waiver_id, expires_at, signed_at')
    .in('member_id', memberIds)
    .in('waiver_id', waiverIds);

  if (sigError) throw new ServiceError(500, sigError.message);

  return computeMemberWaiverGaps(activeWaivers, signatures ?? [], members);
}

export type WaiverCompletionStats = {
  activeWaiverCount: number;
  activeMemberCount: number;
  compliantMemberCount: number;
  complianceRate: number;
};

export async function getWaiverCompletionStats(gymId: string): Promise<WaiverCompletionStats> {
  const gaps = await listMembersWithWaiverGaps(gymId);
  const admin = getAdminClient();

  const [{ count: activeMemberCount }, { count: activeWaiverCount }] = await Promise.all([
    admin
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'active'),
    admin
      .from('waivers')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('is_active', true),
  ]);

  const members = activeMemberCount ?? 0;
  const waivers = activeWaiverCount ?? 0;
  if (members === 0 || waivers === 0) {
    return {
      activeWaiverCount: waivers,
      activeMemberCount: members,
      compliantMemberCount: members,
      complianceRate: 100,
    };
  }

  const gapMemberIds = new Set(gaps.map((g) => g.memberId));
  const compliantMemberCount = members - gapMemberIds.size;

  return {
    activeWaiverCount: waivers,
    activeMemberCount: members,
    compliantMemberCount,
    complianceRate: Math.round((compliantMemberCount / members) * 100),
  };
}

export async function bulkSendWaiverLinks(gymId: string): Promise<{ sent: number; skipped: number }> {
  const gaps = await listMembersWithWaiverGaps(gymId);
  const { sendWaiverLinkToMember } = await import('@/services/waiver-reminders');

  let sent = 0;
  let skipped = 0;

  for (const gap of gaps) {
    if (!gap.email) {
      skipped++;
      continue;
    }
    try {
      await sendWaiverLinkToMember({ gymId, memberId: gap.memberId });
      sent++;
    } catch {
      skipped++;
    }
  }

  return { sent, skipped };
}

export async function exportWaiverSignaturesCsv(gymId: string): Promise<string> {
  const { stringifyCsv } = await import('@/lib/csv');
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('waiver_signatures')
    .select(
      'signed_name, signed_at, expires_at, members(first_name, last_name, email), waivers(title)'
    )
    .eq('gym_id', gymId)
    .order('signed_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);

  const rows = (data ?? []).map((row) => {
    const members = Array.isArray(row.members) ? row.members[0] : row.members;
    const waivers = Array.isArray(row.waivers) ? row.waivers[0] : row.waivers;
    return [
      waivers?.title ?? '',
      members ? `${members.first_name} ${members.last_name}`.trim() : '',
      members?.email ?? '',
      row.signed_name ?? '',
      row.signed_at ?? '',
      row.expires_at ?? '',
    ];
  });

  return stringifyCsv(
    ['waiver_title', 'member_name', 'member_email', 'signed_name', 'signed_at', 'expires_at'],
    rows
  );
}

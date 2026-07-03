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
    .select('*, members(first_name, last_name, email)')
    .eq('waiver_id', waiverId)
    .order('signed_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
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

export async function signWaiver(input: {
  waiverId: string;
  memberId: string;
  gymId: string;
  signedName: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ signatureId: string; pdfStoragePath: string | null }> {
  const admin = getAdminClient();

  const { data: waiver } = await admin
    .from('waivers')
    .select('id, title, body, expires_after_days')
    .eq('id', input.waiverId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (!waiver) throw new ServiceError(404, 'Waiver not found');

  const { data: member } = await admin
    .from('members')
    .select('first_name, last_name, email')
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  const { data: gym } = await admin
    .from('gyms')
    .select('name')
    .eq('id', input.gymId)
    .maybeSingle();

  const signedAt = new Date().toISOString();
  const expiresAt = waiverExpiresAt(
    (waiver as { expires_after_days?: number | null }).expires_after_days ?? null
  );

  const { data: existing } = await admin
    .from('waiver_signatures')
    .select('id, expires_at')
    .eq('waiver_id', input.waiverId)
    .eq('member_id', input.memberId)
    .maybeSingle();

  if (existing) {
    const stillValid =
      !existing.expires_at || new Date(existing.expires_at) > new Date();
    if (stillValid) {
      throw new ServiceError(409, 'This waiver is already signed and still valid.');
    }
  }

  let signatureId: string;

  if (existing) {
    const { data: updated, error: updateError } = await admin
      .from('waiver_signatures')
      .update({
        signed_name: input.signedName.trim(),
        signed_at: signedAt,
        expires_at: expiresAt,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
        pdf_storage_path: null,
      })
      .eq('id', existing.id)
      .select('id')
      .single();

    if (updateError || !updated) throw new ServiceError(500, updateError?.message ?? 'Update failed');
    signatureId = updated.id;
  } else {
    const { data: inserted, error } = await admin
      .from('waiver_signatures')
      .insert({
        waiver_id: input.waiverId,
        member_id: input.memberId,
        gym_id: input.gymId,
        signed_name: input.signedName.trim(),
        signed_at: signedAt,
        expires_at: expiresAt,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
      })
      .select('id')
      .single();

    if (error || !inserted) throw new ServiceError(500, error?.message ?? 'Insert failed');
    signatureId = inserted.id;
  }

  let pdfStoragePath: string | null = null;
  try {
    const { buildWaiverPdf } = await import('@/lib/waiver-pdf');
    const pdfBytes = await buildWaiverPdf({
      gymName: gym?.name ?? 'Gym',
      waiverTitle: waiver.title,
      waiverBody: waiver.body,
      signedName: input.signedName.trim(),
      signedAt,
      memberEmail: member?.email,
    });
    pdfStoragePath = `${input.gymId}/${signatureId}.pdf`;
    const { error: uploadErr } = await admin.storage
      .from('waiver-signatures')
      .upload(pdfStoragePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (!uploadErr) {
      await admin
        .from('waiver_signatures')
        .update({ pdf_storage_path: pdfStoragePath })
        .eq('id', signatureId);
    }
  } catch {
    // PDF storage is best-effort; signature row is still valid.
  }

  return { signatureId, pdfStoragePath };
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
    .select('id, title')
    .eq('gym_id', gymId)
    .eq('is_active', true);

  if (waiverError) throw new ServiceError(500, waiverError.message);
  if (!activeWaivers?.length) return;

  const waiverIds = activeWaivers.map((w) => w.id);
  const { data: signatures, error: sigError } = await admin
    .from('waiver_signatures')
    .select('waiver_id, expires_at, signed_at')
    .eq('member_id', memberId)
    .in('waiver_id', waiverIds);

  if (sigError) throw new ServiceError(500, sigError.message);

  const now = new Date();
  const validSigned = new Set(
    (signatures ?? [])
      .filter((s) => !s.expires_at || new Date(s.expires_at) > now)
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

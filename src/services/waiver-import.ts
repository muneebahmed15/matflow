import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type WaiverPdfImportResult = {
  success: number;
  errors: { file: string; message: string }[];
};

function emailFromPdfFilename(name: string): string | null {
  const base = name.split('/').pop() ?? name;
  const withoutExt = base.replace(/\.pdf$/i, '');
  const email = withoutExt.trim().toLowerCase();
  if (!email.includes('@')) return null;
  return email;
}

/**
 * Import signed waiver PDFs, link to members by email filename, store in waiver-imports bucket.
 */
export async function importSignedWaiverPdfs(input: {
  gymId: string;
  waiverId: string;
  files: { name: string; bytes: Uint8Array }[];
  actorId?: string | null;
}): Promise<WaiverPdfImportResult> {
  const admin = getAdminClient();
  const result: WaiverPdfImportResult = { success: 0, errors: [] };

  const { data: waiver } = await admin
    .from('waivers')
    .select('id, title, version, expires_after_days')
    .eq('id', input.waiverId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (!waiver) throw new ServiceError(404, 'Waiver template not found.');

  const waiverVersion = (waiver as { version?: number }).version ?? 1;
  const expiresAfterDays = (waiver as { expires_after_days?: number | null }).expires_after_days;

  for (const file of input.files) {
    const email = emailFromPdfFilename(file.name);
    if (!email) {
      result.errors.push({
        file: file.name,
        message: 'Filename must be email.pdf (e.g. john@example.com.pdf).',
      });
      continue;
    }

    const { data: member } = await admin
      .from('members')
      .select('id, first_name, last_name')
      .eq('gym_id', input.gymId)
      .ilike('email', email)
      .maybeSingle();

    if (!member) {
      result.errors.push({ file: file.name, message: `No member found for ${email}.` });
      continue;
    }

    const signatureId = crypto.randomUUID();
    const storagePath = `${input.gymId}/${signatureId}.pdf`;

    const { error: uploadErr } = await admin.storage
      .from('waiver-imports')
      .upload(storagePath, file.bytes, { contentType: 'application/pdf', upsert: false });

    if (uploadErr) {
      result.errors.push({ file: file.name, message: uploadErr.message });
      continue;
    }

    const signedAt = new Date().toISOString();
    let expiresAt: string | null = null;
    if (expiresAfterDays && expiresAfterDays > 0) {
      const exp = new Date();
      exp.setDate(exp.getDate() + expiresAfterDays);
      expiresAt = exp.toISOString();
    }

    const signedName = `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim() || email;

    const { error: insertErr } = await admin.from('waiver_signatures').insert({
      id: signatureId,
      waiver_id: input.waiverId,
      member_id: member.id,
      gym_id: input.gymId,
      signed_name: signedName,
      signed_at: signedAt,
      expires_at: expiresAt,
      waiver_version: waiverVersion,
      pdf_storage_path: storagePath,
    });

    if (insertErr) {
      result.errors.push({ file: file.name, message: insertErr.message });
      continue;
    }

    result.success += 1;
  }

  return result;
}

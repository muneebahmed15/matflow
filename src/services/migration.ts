import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { createMember } from '@/services/members';

export const MAX_IMPORT_ROWS = 5000;

export type ImportJob = {
  id: string;
  gym_id: string;
  import_type: string;
  status: string;
  file_name: string | null;
  total_rows: number;
  success_rows: number;
  error_rows: number;
  created_at: string;
  completed_at: string | null;
};

export async function listImportJobs(gymId: string): Promise<ImportJob[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('import_jobs')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as ImportJob[];
}

export type MemberImportRow = {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  belt_rank?: string;
  status?: string;
  external_id?: string;
};

export async function importMembersFromRows(
  gymId: string,
  rows: MemberImportRow[],
  options: { fileName?: string; createdBy?: string; dryRun?: boolean }
): Promise<{ jobId: string; success: number; errors: { row: number; message: string }[] }> {
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new ServiceError(400, `Import limited to ${MAX_IMPORT_ROWS} rows per job.`);
  }
  const admin = getAdminClient();

  const { data: job, error: jobErr } = await admin
    .from('import_jobs')
    .insert({
      gym_id: gymId,
      import_type: 'members',
      status: 'processing',
      file_name: options.fileName ?? null,
      total_rows: rows.length,
      created_by: options.createdBy ?? null,
    })
    .select('id')
    .single();

  if (jobErr || !job) throw new ServiceError(500, jobErr?.message ?? 'Failed to create import job');

  const errors: { row: number; message: string }[] = [];
  let success = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.first_name?.trim() || !row.last_name?.trim()) {
      errors.push({ row: rowNum, message: 'first_name and last_name are required' });
      continue;
    }

    if (options.dryRun) {
      success++;
      continue;
    }

    try {
      if (row.external_id) {
        const { data: existing } = await admin
          .from('members')
          .select('id')
          .eq('gym_id', gymId)
          .eq('external_id', row.external_id)
          .maybeSingle();

        if (existing) {
          errors.push({ row: rowNum, message: `Duplicate external_id: ${row.external_id}` });
          continue;
        }
      }

      const member = await createMember({
        gymId,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        beltRank: row.belt_rank ?? 'white',
        status: row.status ?? 'active',
        familyOption: 'none',
      });

      if (row.external_id) {
        await admin
          .from('members')
          .update({ external_id: row.external_id })
          .eq('id', member.id);
      }

      success++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      errors.push({ row: rowNum, message });
      await admin.from('import_row_errors').insert({
        job_id: job.id,
        row_number: rowNum,
        row_data: row,
        error_message: message,
      });
    }
  }

  await admin
    .from('import_jobs')
    .update({
      status: errors.length === rows.length ? 'failed' : 'completed',
      success_rows: success,
      error_rows: errors.length,
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  return { jobId: job.id, success, errors };
}

export type LeadImportRow = {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: string;
  notes?: string;
};

export async function importLeadsFromRows(
  gymId: string,
  rows: LeadImportRow[],
  options: { fileName?: string; createdBy?: string; dryRun?: boolean }
): Promise<{ jobId: string; success: number; errors: { row: number; message: string }[] }> {
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new ServiceError(400, `Import limited to ${MAX_IMPORT_ROWS} rows per job.`);
  }
  const admin = getAdminClient();
  const { createLead } = await import('@/services/leads');

  const { data: job, error: jobErr } = await admin
    .from('import_jobs')
    .insert({
      gym_id: gymId,
      import_type: 'leads',
      status: 'processing',
      file_name: options.fileName ?? null,
      total_rows: rows.length,
      created_by: options.createdBy ?? null,
    })
    .select('id')
    .single();

  if (jobErr || !job) throw new ServiceError(500, jobErr?.message ?? 'Failed to create import job');

  const errors: { row: number; message: string }[] = [];
  let success = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.first_name?.trim() || !row.last_name?.trim()) {
      errors.push({ row: rowNum, message: 'first_name and last_name are required' });
      continue;
    }

    if (options.dryRun) {
      success++;
      continue;
    }

    try {
      await createLead({
        gymId,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        source: row.source ?? 'import',
        notes: row.notes,
      });
      success++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      errors.push({ row: rowNum, message });
      await admin.from('import_row_errors').insert({
        job_id: job.id,
        row_number: rowNum,
        row_data: row,
        error_message: message,
      });
    }
  }

  await admin
    .from('import_jobs')
    .update({
      status: errors.length === rows.length ? 'failed' : 'completed',
      success_rows: success,
      error_rows: errors.length,
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  return { jobId: job.id, success, errors };
}

export async function getImportJobErrors(jobId: string, gymId: string) {
  const admin = getAdminClient();
  const { data: job } = await admin
    .from('import_jobs')
    .select('id')
    .eq('id', jobId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (!job) throw new ServiceError(404, 'Import job not found');

  const { data, error } = await admin
    .from('import_row_errors')
    .select('row_number, error_message, row_data')
    .eq('job_id', jobId)
    .order('row_number');

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}

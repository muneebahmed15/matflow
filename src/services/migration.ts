import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { createMember } from '@/services/members';
import { CLASS_WEEKDAYS } from '@/lib/class-recurrence';
import { normalizeClassColor } from '@/lib/class-tags';
import type { CreateClassInput } from '@/services/classes';

export const MAX_IMPORT_ROWS = 5000;
export const IMPORT_BATCH_SIZE = 25;

export type DuplicateEmailStrategy = 'error' | 'skip' | 'update';

async function findMemberIdByEmail(
  gymId: string,
  email: string | undefined
): Promise<string | null> {
  if (!email?.trim()) return null;
  const admin = getAdminClient();
  const { data } = await admin
    .from('members')
    .select('id')
    .eq('gym_id', gymId)
    .ilike('email', email.trim().toLowerCase())
    .maybeSingle();
  return data?.id ?? null;
}

async function upsertImportedMember(
  gymId: string,
  jobId: string,
  row: MemberImportRow,
  duplicateStrategy: DuplicateEmailStrategy
): Promise<'created' | 'updated' | 'skipped'> {
  const admin = getAdminClient();
  const { updateMember } = await import('@/services/members');

  if (row.external_id) {
    const { data: existing } = await admin
      .from('members')
      .select('id')
      .eq('gym_id', gymId)
      .eq('external_id', row.external_id)
      .maybeSingle();

    if (existing) {
      throw new ServiceError(409, `Duplicate external_id: ${row.external_id}`);
    }
  }

  const existingId = await findMemberIdByEmail(gymId, row.email);
  if (existingId) {
    if (duplicateStrategy === 'skip') return 'skipped';
    if (duplicateStrategy === 'update') {
      await updateMember(gymId, existingId, {
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone,
        belt_rank: row.belt_rank ?? undefined,
        status: row.status ?? undefined,
      });
      await admin
        .from('members')
        .update({
          ...(row.external_id ? { external_id: row.external_id } : {}),
          import_job_id: jobId,
        })
        .eq('id', existingId);
      return 'updated';
    }
    throw new ServiceError(409, 'A member with this email already exists.');
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
      .update({ external_id: row.external_id, import_job_id: jobId })
      .eq('id', member.id);
  } else {
    await admin.from('members').update({ import_job_id: jobId }).eq('id', member.id);
  }

  return 'created';
}

export async function logImportCommit(input: {
  gymId: string;
  actorId?: string | null;
  jobId: string;
  importType: string;
  success: number;
  errorCount: number;
  fileName?: string | null;
}): Promise<void> {
  try {
    const { logAuditEvent } = await import('@/services/audit');
    await logAuditEvent({
      gymId: input.gymId,
      actorId: input.actorId ?? null,
      action: 'import.commit',
      entityType: 'import_job',
      entityId: input.jobId,
      payload: {
        import_type: input.importType,
        success_rows: input.success,
        error_rows: input.errorCount,
        file_name: input.fileName ?? null,
      },
    });
  } catch {
    // Audit logging must not block imports.
  }
}

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
  options: {
    fileName?: string;
    createdBy?: string;
    dryRun?: boolean;
    duplicateEmailStrategy?: DuplicateEmailStrategy;
  }
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
      const outcome = await upsertImportedMember(
        gymId,
        job.id,
        row,
        options.duplicateEmailStrategy ?? 'error'
      );
      if (outcome === 'skipped') {
        success++;
        continue;
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

  if (!options.dryRun) {
    await logImportCommit({
      gymId,
      actorId: options.createdBy,
      jobId: job.id,
      importType: 'members',
      success,
      errorCount: errors.length,
      fileName: options.fileName,
    });
  }

  return { jobId: job.id, success, errors };
}

export async function createImportJob(
  gymId: string,
  importType: string,
  totalRows: number,
  options: { fileName?: string; createdBy?: string }
): Promise<string> {
  const admin = getAdminClient();
  const { data: job, error } = await admin
    .from('import_jobs')
    .insert({
      gym_id: gymId,
      import_type: importType,
      status: 'processing',
      file_name: options.fileName ?? null,
      total_rows: totalRows,
      created_by: options.createdBy ?? null,
    })
    .select('id')
    .single();

  if (error || !job) throw new ServiceError(500, error?.message ?? 'Failed to create import job');
  return job.id;
}

export async function completeImportJob(
  jobId: string,
  success: number,
  errors: { row: number; message: string }[],
  options?: { gymId?: string; actorId?: string | null; importType?: string; fileName?: string | null }
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('import_jobs')
    .update({
      status: success === 0 && errors.length > 0 ? 'failed' : 'completed',
      success_rows: success,
      error_rows: errors.length,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) throw new ServiceError(500, error.message);

  if (options?.gymId) {
    await logImportCommit({
      gymId: options.gymId,
      actorId: options.actorId,
      jobId,
      importType: options.importType ?? 'unknown',
      success,
      errorCount: errors.length,
      fileName: options.fileName,
    });
  }
}

export async function importMembersBatch(
  gymId: string,
  jobId: string,
  rows: MemberImportRow[],
  startIndex: number,
  duplicateEmailStrategy: DuplicateEmailStrategy = 'error'
): Promise<{ success: number; errors: { row: number; message: string }[] }> {
  const admin = getAdminClient();
  const errors: { row: number; message: string }[] = [];
  let success = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = startIndex + i + 2;

    if (!row.first_name?.trim() || !row.last_name?.trim()) {
      errors.push({ row: rowNum, message: 'first_name and last_name are required' });
      continue;
    }

    try {
      const outcome = await upsertImportedMember(gymId, jobId, row, duplicateEmailStrategy);
      if (outcome === 'skipped') {
        success++;
        continue;
      }
      success++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      errors.push({ row: rowNum, message });
      await admin.from('import_row_errors').insert({
        job_id: jobId,
        row_number: rowNum,
        row_data: row,
        error_message: message,
      });
    }
  }

  const { data: job } = await admin
    .from('import_jobs')
    .select('success_rows, error_rows')
    .eq('id', jobId)
    .single();

  await admin
    .from('import_jobs')
    .update({
      success_rows: (job?.success_rows ?? 0) + success,
      error_rows: (job?.error_rows ?? 0) + errors.length,
    })
    .eq('id', jobId);

  return { success, errors };
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

export async function importLeadsBatch(
  gymId: string,
  jobId: string,
  rows: LeadImportRow[],
  startIndex: number
): Promise<{ success: number; errors: { row: number; message: string }[] }> {
  const admin = getAdminClient();
  const { createLead } = await import('@/services/leads');
  const errors: { row: number; message: string }[] = [];
  let success = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = startIndex + i + 2;

    if (!row.first_name?.trim() || !row.last_name?.trim()) {
      errors.push({ row: rowNum, message: 'first_name and last_name are required' });
      continue;
    }

    try {
      const lead = await createLead({
        gymId,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        source: row.source ?? 'import',
        notes: row.notes,
        skipAutomation: true,
      });
      await admin.from('leads').update({ import_job_id: jobId }).eq('id', lead.id);
      success++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      errors.push({ row: rowNum, message });
      await admin.from('import_row_errors').insert({
        job_id: jobId,
        row_number: rowNum,
        row_data: row,
        error_message: message,
      });
    }
  }

  const { data: job } = await admin
    .from('import_jobs')
    .select('success_rows, error_rows')
    .eq('id', jobId)
    .single();

  await admin
    .from('import_jobs')
    .update({
      success_rows: (job?.success_rows ?? 0) + success,
      error_rows: (job?.error_rows ?? 0) + errors.length,
    })
    .eq('id', jobId);

  return { success, errors };
}

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
      const lead = await createLead({
        gymId,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        source: row.source ?? 'import',
        notes: row.notes,
        skipAutomation: true,
      });
      await admin.from('leads').update({ import_job_id: job.id }).eq('id', lead.id);
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

  if (!options.dryRun) {
    await logImportCommit({
      gymId,
      actorId: options.createdBy,
      jobId: job.id,
      importType: 'leads',
      success,
      errorCount: errors.length,
      fileName: options.fileName,
    });
  }

  return { jobId: job.id, success, errors };
}

/** Build lookup maps (by lowercased email and by external_id) for member matching. */
export function buildMemberLookup(
  members: { id: string; email: string | null; external_id: string | null }[]
): { byEmail: Map<string, string>; byExternalId: Map<string, string> } {
  const byEmail = new Map<string, string>();
  const byExternalId = new Map<string, string>();
  for (const m of members) {
    if (m.email) byEmail.set(m.email.toLowerCase(), m.id);
    if (m.external_id) byExternalId.set(m.external_id, m.id);
  }
  return { byEmail, byExternalId };
}

/** Resolve a row to a member id via external_id first, then email. Null when unmatched. */
export function resolveMemberId(
  lookup: { byEmail: Map<string, string>; byExternalId: Map<string, string> },
  row: { email?: string; external_id?: string }
): string | null {
  if (row.external_id) {
    const id = lookup.byExternalId.get(row.external_id.trim());
    if (id) return id;
  }
  if (row.email) {
    const id = lookup.byEmail.get(row.email.trim().toLowerCase());
    if (id) return id;
  }
  return null;
}

/** Parse a date (YYYY-MM-DD) or datetime string to an ISO timestamp. Null when invalid. */
export function parseImportTimestamp(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  // Date-only values are pinned to noon local time to avoid timezone day-shift
  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getTime() > Date.now()) return null;
  return parsed.toISOString();
}

async function fetchMemberLookup(gymId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('members')
    .select('id, email, external_id')
    .eq('gym_id', gymId);
  if (error) throw new ServiceError(500, error.message);
  return buildMemberLookup(data ?? []);
}

export type AttendanceImportRow = {
  email?: string;
  external_id?: string;
  checked_in_at: string;
  notes?: string;
};

export async function importAttendanceFromRows(
  gymId: string,
  rows: AttendanceImportRow[],
  options: { fileName?: string; createdBy?: string; dryRun?: boolean }
): Promise<{ jobId: string; success: number; errors: { row: number; message: string }[] }> {
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new ServiceError(400, `Import limited to ${MAX_IMPORT_ROWS} rows per job.`);
  }
  const admin = getAdminClient();
  const lookup = await fetchMemberLookup(gymId);

  const { data: job, error: jobErr } = await admin
    .from('import_jobs')
    .insert({
      gym_id: gymId,
      import_type: 'attendance',
      status: 'processing',
      file_name: options.fileName ?? null,
      total_rows: rows.length,
      created_by: options.createdBy ?? null,
    })
    .select('id')
    .single();

  if (jobErr || !job) throw new ServiceError(500, jobErr?.message ?? 'Failed to create import job');

  const errors: { row: number; message: string }[] = [];
  const inserts: {
    gym_id: string;
    member_id: string;
    checked_in_at: string;
    notes: string | null;
    import_job_id: string;
  }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const memberId = resolveMemberId(lookup, row);
    if (!memberId) {
      errors.push({ row: rowNum, message: 'No member matched by external_id or email' });
      continue;
    }

    const checkedInAt = parseImportTimestamp(row.checked_in_at);
    if (!checkedInAt) {
      errors.push({ row: rowNum, message: `Invalid or future date: ${row.checked_in_at ?? ''}` });
      continue;
    }

    inserts.push({
      gym_id: gymId,
      member_id: memberId,
      checked_in_at: checkedInAt,
      notes: row.notes?.trim() || null,
      import_job_id: job.id,
    });
  }

  let success = 0;
  if (!options.dryRun && inserts.length > 0) {
    const { error } = await admin.from('attendance').insert(inserts);
    if (error) {
      errors.push({ row: 0, message: error.message });
    } else {
      success = inserts.length;
    }
  } else {
    success = inserts.length;
  }

  if (errors.length > 0 && !options.dryRun) {
    await admin.from('import_row_errors').insert(
      errors
        .filter((e) => e.row > 0)
        .map((e) => ({
          job_id: job.id,
          row_number: e.row,
          row_data: rows[e.row - 2] ?? {},
          error_message: e.message,
        }))
    );
  }

  await admin
    .from('import_jobs')
    .update({
      status: success === 0 && errors.length > 0 ? 'failed' : 'completed',
      success_rows: success,
      error_rows: errors.length,
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  if (!options.dryRun) {
    await logImportCommit({
      gymId,
      actorId: options.createdBy,
      jobId: job.id,
      importType: 'attendance',
      success,
      errorCount: errors.length,
      fileName: options.fileName,
    });
  }

  return { jobId: job.id, success, errors };
}

export type BeltHistoryImportRow = {
  email?: string;
  external_id?: string;
  from_belt?: string;
  to_belt: string;
  promoted_at: string;
  notes?: string;
};

export async function importBeltHistoryFromRows(
  gymId: string,
  rows: BeltHistoryImportRow[],
  options: { fileName?: string; createdBy?: string; dryRun?: boolean }
): Promise<{ jobId: string; success: number; errors: { row: number; message: string }[] }> {
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new ServiceError(400, `Import limited to ${MAX_IMPORT_ROWS} rows per job.`);
  }
  const admin = getAdminClient();
  const lookup = await fetchMemberLookup(gymId);

  const { getGymBeltSystem } = await import('@/services/belts');
  const { isValidBelt } = await import('@/lib/belt-systems');
  const beltSystem = await getGymBeltSystem(gymId);

  const { data: job, error: jobErr } = await admin
    .from('import_jobs')
    .insert({
      gym_id: gymId,
      import_type: 'belt_history',
      status: 'processing',
      file_name: options.fileName ?? null,
      total_rows: rows.length,
      created_by: options.createdBy ?? null,
    })
    .select('id')
    .single();

  if (jobErr || !job) throw new ServiceError(500, jobErr?.message ?? 'Failed to create import job');

  const errors: { row: number; message: string }[] = [];
  const inserts: {
    gym_id: string;
    member_id: string;
    from_belt: string;
    to_belt: string;
    promoted_at: string;
    notes: string | null;
    import_job_id: string;
  }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const memberId = resolveMemberId(lookup, row);
    if (!memberId) {
      errors.push({ row: rowNum, message: 'No member matched by external_id or email' });
      continue;
    }

    const toBelt = row.to_belt?.trim().toLowerCase();
    if (!toBelt || !isValidBelt(beltSystem, toBelt)) {
      errors.push({
        row: rowNum,
        message: `Invalid belt "${row.to_belt ?? ''}" for this gym's belt system`,
      });
      continue;
    }

    const fromBelt = row.from_belt?.trim().toLowerCase() || '';
    if (fromBelt && !isValidBelt(beltSystem, fromBelt)) {
      errors.push({
        row: rowNum,
        message: `Invalid belt "${row.from_belt}" for this gym's belt system`,
      });
      continue;
    }

    const promotedAt = parseImportTimestamp(row.promoted_at);
    if (!promotedAt) {
      errors.push({ row: rowNum, message: `Invalid or future date: ${row.promoted_at ?? ''}` });
      continue;
    }

    inserts.push({
      gym_id: gymId,
      member_id: memberId,
      from_belt: fromBelt || 'unknown',
      to_belt: toBelt,
      promoted_at: promotedAt,
      notes: row.notes?.trim() || null,
      import_job_id: job.id,
    });
  }

  let success = 0;
  if (!options.dryRun && inserts.length > 0) {
    const { error } = await admin.from('belt_promotions').insert(inserts);
    if (error) {
      errors.push({ row: 0, message: error.message });
    } else {
      success = inserts.length;
    }
  } else {
    success = inserts.length;
  }

  if (errors.length > 0 && !options.dryRun) {
    await admin.from('import_row_errors').insert(
      errors
        .filter((e) => e.row > 0)
        .map((e) => ({
          job_id: job.id,
          row_number: e.row,
          row_data: rows[e.row - 2] ?? {},
          error_message: e.message,
        }))
    );
  }

  await admin
    .from('import_jobs')
    .update({
      status: success === 0 && errors.length > 0 ? 'failed' : 'completed',
      success_rows: success,
      error_rows: errors.length,
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  if (!options.dryRun) {
    await logImportCommit({
      gymId,
      actorId: options.createdBy,
      jobId: job.id,
      importType: 'belt_history',
      success,
      errorCount: errors.length,
      fileName: options.fileName,
    });
  }

  return { jobId: job.id, success, errors };
}

export type ClassImportRow = {
  name: string;
  instructor: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  capacity: string | number;
  category_tag?: string;
  color?: string;
  description?: string;
};

const CLASS_IMPORT_TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;

function normalizeImportTime(value: string): string | null {
  const trimmed = value.trim();
  if (!CLASS_IMPORT_TIME.test(trimmed)) return null;
  const [hours, minutes] = trimmed.split(':');
  return `${hours.padStart(2, '0')}:${minutes}`;
}

function normalizeImportDay(value: string): string | null {
  const match = CLASS_WEEKDAYS.find((day) => day.toLowerCase() === value.trim().toLowerCase());
  return match ?? null;
}

/** Validate a CSV row for class schedule import. Exported for unit tests. */
export function validateClassImportRow(
  row: ClassImportRow
): { ok: true; parsed: Omit<CreateClassInput, 'gymId'> } | { ok: false; message: string } {
  const name = row.name?.trim();
  if (!name) return { ok: false, message: 'name is required' };

  const instructor = row.instructor?.trim();
  if (!instructor) return { ok: false, message: 'instructor is required' };

  const dayOfWeek = normalizeImportDay(row.day_of_week ?? '');
  if (!dayOfWeek) {
    return { ok: false, message: `Invalid day_of_week: ${row.day_of_week ?? ''}` };
  }

  const startTime = normalizeImportTime(row.start_time ?? '');
  if (!startTime) {
    return { ok: false, message: `Invalid start_time: ${row.start_time ?? ''}` };
  }

  const endTime = normalizeImportTime(row.end_time ?? '');
  if (!endTime) {
    return { ok: false, message: `Invalid end_time: ${row.end_time ?? ''}` };
  }

  const capacityRaw = String(row.capacity ?? '').trim();
  const capacity = Number.parseInt(capacityRaw, 10);
  if (!capacityRaw || Number.isNaN(capacity) || capacity < 1) {
    return { ok: false, message: 'capacity must be a positive integer' };
  }

  const color = row.color?.trim();
  if (color && !normalizeClassColor(color)) {
    return { ok: false, message: `Invalid color: ${color}` };
  }

  return {
    ok: true,
    parsed: {
      name,
      instructor,
      dayOfWeek,
      startTime,
      endTime,
      capacity,
      categoryTag: row.category_tag,
      color: row.color,
      description: row.description,
    },
  };
}

export async function importClassesFromRows(
  gymId: string,
  rows: ClassImportRow[],
  options: { fileName?: string; createdBy?: string; dryRun?: boolean }
): Promise<{ jobId: string; success: number; errors: { row: number; message: string }[] }> {
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new ServiceError(400, `Import limited to ${MAX_IMPORT_ROWS} rows per job.`);
  }

  const admin = getAdminClient();
  const { createClass } = await import('@/services/classes');

  const { data: job, error: jobErr } = await admin
    .from('import_jobs')
    .insert({
      gym_id: gymId,
      import_type: 'classes',
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
    const validated = validateClassImportRow(row);

    if (!validated.ok) {
      errors.push({ row: rowNum, message: validated.message });
      continue;
    }

    if (options.dryRun) {
      success++;
      continue;
    }

    try {
      const created = await createClass({ gymId, ...validated.parsed });
      await admin.from('classes').update({ import_job_id: job.id }).eq('id', created.id);
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
      status: success === 0 && errors.length > 0 ? 'failed' : 'completed',
      success_rows: success,
      error_rows: errors.length,
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  if (!options.dryRun) {
    await logImportCommit({
      gymId,
      actorId: options.createdBy,
      jobId: job.id,
      importType: 'classes',
      success,
      errorCount: errors.length,
      fileName: options.fileName,
    });
  }

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

export async function rollbackImportJob(gymId: string, jobId: string): Promise<{ removed: number }> {
  const admin = getAdminClient();

  const { data: job, error: jobError } = await admin
    .from('import_jobs')
    .select('id, import_type, status, rolled_back_at')
    .eq('id', jobId)
    .eq('gym_id', gymId)
    .maybeSingle();

  if (jobError) throw new ServiceError(500, jobError.message);
  if (!job) throw new ServiceError(404, 'Import job not found');
  if (job.rolled_back_at) throw new ServiceError(400, 'Import job was already rolled back.');
  if (job.status !== 'completed') {
    throw new ServiceError(400, 'Only completed imports can be rolled back.');
  }

  let removed = 0;

  if (job.import_type === 'members') {
    const { data: members } = await admin
      .from('members')
      .select('id')
      .eq('gym_id', gymId)
      .eq('import_job_id', jobId);

    const ids = (members ?? []).map((m) => m.id);
    if (ids.length > 0) {
      const { error } = await admin.from('members').delete().in('id', ids);
      if (error) throw new ServiceError(500, error.message);
      removed = ids.length;
    }
  } else if (job.import_type === 'leads') {
    const { data: leads } = await admin
      .from('leads')
      .select('id')
      .eq('gym_id', gymId)
      .eq('import_job_id', jobId);

    const ids = (leads ?? []).map((l) => l.id);
    if (ids.length > 0) {
      const { error } = await admin.from('leads').delete().in('id', ids);
      if (error) throw new ServiceError(500, error.message);
      removed = ids.length;
    }
  } else if (job.import_type === 'attendance' || job.import_type === 'belt_history') {
    const table = job.import_type === 'attendance' ? 'attendance' : 'belt_promotions';
    const { data: recs } = await admin
      .from(table)
      .select('id')
      .eq('gym_id', gymId)
      .eq('import_job_id', jobId);

    const ids = (recs ?? []).map((r) => r.id);
    if (ids.length > 0) {
      const { error } = await admin.from(table).delete().in('id', ids);
      if (error) throw new ServiceError(500, error.message);
      removed = ids.length;
    }
  } else if (job.import_type === 'classes') {
    const { data: classes } = await admin
      .from('classes')
      .select('id')
      .eq('gym_id', gymId)
      .eq('import_job_id', jobId);

    const ids = (classes ?? []).map((c) => c.id);
    if (ids.length > 0) {
      const { error } = await admin.from('classes').delete().in('id', ids);
      if (error) throw new ServiceError(500, error.message);
      removed = ids.length;
    }
  } else {
    throw new ServiceError(400, 'Rollback is not supported for this import type.');
  }

  await admin
    .from('import_jobs')
    .update({ rolled_back_at: new Date().toISOString(), status: 'rolled_back' })
    .eq('id', jobId);

  return { removed };
}

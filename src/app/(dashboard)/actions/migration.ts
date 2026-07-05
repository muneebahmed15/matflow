'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  memberImportRowSchema,
  leadImportRowSchema,
  attendanceImportRowSchema,
  beltHistoryImportRowSchema,
  classImportRowSchema,
  validateImportRows,
} from '@/lib/import-schemas';
import {
  importMembersFromRows,
  listImportJobs,
  importLeadsFromRows,
  getImportJobErrors,
  rollbackImportJob,
  createImportJob,
  completeImportJob,
  importMembersBatch,
  importLeadsBatch,
  IMPORT_BATCH_SIZE,
  type ImportJob,
  type DuplicateEmailStrategy,
} from '@/services/migration';
import { type ActionResult, toActionError } from './_shared';

export async function rollbackImportJobAction(jobId: string): Promise<
  ActionResult<{ removed: number }>
> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const result = await rollbackImportJob(auth.gymId, jobId);
    revalidatePath('/migration');
    return { ok: true, data: result };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listImportJobsAction(): Promise<ActionResult<ImportJob[]>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true, data: await listImportJobs(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function importMembersCsvAction(input: {
  rows: Record<string, string>[];
  fileName?: string;
  dryRun?: boolean;
  duplicateEmailStrategy?: DuplicateEmailStrategy;
}): Promise<ActionResult<{ jobId: string; success: number; errors: { row: number; message: string }[] }>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const limit = await checkRateLimit(`import:${auth.gymId}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { ok: false, error: 'Import rate limit exceeded. Try again in an hour.' };
    }

    const { rows: validatedRows, errors: schemaErrors } = validateImportRows(
      memberImportRowSchema,
      input.rows
    );
    if (schemaErrors.length > 0 && validatedRows.length === 0) {
      return { ok: true, data: { jobId: '', success: 0, errors: schemaErrors } };
    }

    const result = await importMembersFromRows(auth.gymId, validatedRows, {
      fileName: input.fileName,
      createdBy: auth.user.id,
      dryRun: input.dryRun,
      duplicateEmailStrategy: input.duplicateEmailStrategy ?? 'error',
    });
    revalidatePath('/migration');
    revalidatePath('/members');
    return {
      ok: true,
      data: {
        ...result,
        errors: [...schemaErrors, ...result.errors],
        success: result.success,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function importLeadsCsvAction(input: {
  rows: Record<string, string>[];
  fileName?: string;
  dryRun?: boolean;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const limit = await checkRateLimit(`import:${auth.gymId}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { ok: false as const, error: 'Import rate limit exceeded. Try again in an hour.' };
    }

    const { rows: validatedRows, errors: schemaErrors } = validateImportRows(
      leadImportRowSchema,
      input.rows
    );
    if (schemaErrors.length > 0 && validatedRows.length === 0) {
      return { ok: true as const, data: { jobId: '', success: 0, errors: schemaErrors } };
    }

    const result = await importLeadsFromRows(auth.gymId, validatedRows, {
      fileName: input.fileName,
      createdBy: auth.user.id,
      dryRun: input.dryRun,
    });
    revalidatePath('/migration');
    revalidatePath('/leads');
    return {
      ok: true as const,
      data: { ...result, errors: [...schemaErrors, ...result.errors] },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function importAttendanceCsvAction(input: {
  rows: Record<string, string>[];
  fileName?: string;
  dryRun?: boolean;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const limit = await checkRateLimit(`import:${auth.gymId}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { ok: false as const, error: 'Import rate limit exceeded. Try again in an hour.' };
    }

    const { rows: validatedRows, errors: schemaErrors } = validateImportRows(
      attendanceImportRowSchema,
      input.rows
    );
    if (schemaErrors.length > 0 && validatedRows.length === 0) {
      return { ok: true as const, data: { jobId: '', success: 0, errors: schemaErrors } };
    }

    const { importAttendanceFromRows } = await import('@/services/migration');
    const result = await importAttendanceFromRows(auth.gymId, validatedRows, {
      fileName: input.fileName,
      createdBy: auth.user.id,
      dryRun: input.dryRun,
    });
    revalidatePath('/migration');
    revalidatePath('/attendance');
    return {
      ok: true as const,
      data: { ...result, errors: [...schemaErrors, ...result.errors] },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function importBeltHistoryCsvAction(input: {
  rows: Record<string, string>[];
  fileName?: string;
  dryRun?: boolean;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const limit = await checkRateLimit(`import:${auth.gymId}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { ok: false as const, error: 'Import rate limit exceeded. Try again in an hour.' };
    }

    const { rows: validatedRows, errors: schemaErrors } = validateImportRows(
      beltHistoryImportRowSchema,
      input.rows
    );
    if (schemaErrors.length > 0 && validatedRows.length === 0) {
      return { ok: true as const, data: { jobId: '', success: 0, errors: schemaErrors } };
    }

    const { importBeltHistoryFromRows } = await import('@/services/migration');
    const result = await importBeltHistoryFromRows(auth.gymId, validatedRows, {
      fileName: input.fileName,
      createdBy: auth.user.id,
      dryRun: input.dryRun,
    });
    revalidatePath('/migration');
    revalidatePath('/belts');
    return {
      ok: true as const,
      data: { ...result, errors: [...schemaErrors, ...result.errors] },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function importClassesCsvAction(input: {
  rows: Record<string, string>[];
  fileName?: string;
  dryRun?: boolean;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const limit = await checkRateLimit(`import:${auth.gymId}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { ok: false as const, error: 'Import rate limit exceeded. Try again in an hour.' };
    }

    const { rows: validatedRows, errors: schemaErrors } = validateImportRows(
      classImportRowSchema,
      input.rows
    );
    if (schemaErrors.length > 0 && validatedRows.length === 0) {
      return { ok: true as const, data: { jobId: '', success: 0, errors: schemaErrors } };
    }

    const { importClassesFromRows } = await import('@/services/migration');
    const result = await importClassesFromRows(auth.gymId, validatedRows, {
      fileName: input.fileName,
      createdBy: auth.user.id,
      dryRun: input.dryRun,
    });
    revalidatePath('/migration');
    revalidatePath('/classes');
    return {
      ok: true as const,
      data: { ...result, errors: [...schemaErrors, ...result.errors] },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getImportErrorsAction(jobId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await getImportJobErrors(jobId, auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function startImportJobAction(input: {
  importType: 'members' | 'leads' | 'attendance' | 'belt_history' | 'classes';
  fileName?: string;
  totalRows: number;
}): Promise<ActionResult<{ jobId: string }>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const jobId = await createImportJob(auth.gymId, input.importType, input.totalRows, {
      fileName: input.fileName,
      createdBy: auth.user.id,
    });
    return { ok: true, data: { jobId } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function importMembersBatchAction(input: {
  jobId: string;
  rows: Record<string, string>[];
  startIndex: number;
  duplicateEmailStrategy?: DuplicateEmailStrategy;
}): Promise<ActionResult<{ success: number; errors: { row: number; message: string }[] }>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { rows: validatedRows, errors: schemaErrors } = validateImportRows(
      memberImportRowSchema,
      input.rows,
      input.startIndex
    );
    const result = await importMembersBatch(
      auth.gymId,
      input.jobId,
      validatedRows,
      input.startIndex,
      input.duplicateEmailStrategy ?? 'error'
    );
    return { ok: true, data: { ...result, errors: [...schemaErrors, ...result.errors] } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function importLeadsBatchAction(input: {
  jobId: string;
  rows: Record<string, string>[];
  startIndex: number;
}): Promise<ActionResult<{ success: number; errors: { row: number; message: string }[] }>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { rows: validatedRows, errors: schemaErrors } = validateImportRows(
      leadImportRowSchema,
      input.rows,
      input.startIndex
    );
    const result = await importLeadsBatch(auth.gymId, input.jobId, validatedRows, input.startIndex);
    return { ok: true, data: { ...result, errors: [...schemaErrors, ...result.errors] } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function finalizeImportJobAction(input: {
  jobId: string;
  importType: 'members' | 'leads';
  fileName?: string;
  success: number;
  errors: { row: number; message: string }[];
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await completeImportJob(input.jobId, input.success, input.errors, {
      gymId: auth.gymId,
      actorId: auth.user.id,
      importType: input.importType,
      fileName: input.fileName ?? null,
    });
    revalidatePath('/migration');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export { IMPORT_BATCH_SIZE };
export type { DuplicateEmailStrategy };

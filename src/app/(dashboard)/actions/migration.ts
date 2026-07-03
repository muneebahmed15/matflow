'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/staff';
import { isServiceError } from '@/services/errors';
import {
  createMember,
  archiveMember,
  deleteMember,
  exportMembersCsv,
  getMember,
  listFamilies,
  listMembers,
  updateMember,
  type CreateMemberInput,
  type MemberDetail,
  type MemberSummary,
} from '@/services/members';
import { getGymSettings, updateGymSettings, completeGymSetup, type GymSettings } from '@/services/gym';
import { createLead, convertLeadToMember, updateLeadStatus, updateLeadNotes, assignLead, getMarketingFunnel, getLeadSourceStats } from '@/services/leads';
import { createClass, deleteClass, duplicateClass, listClassesForStaff } from '@/services/classes';
import { getInstructorScopedClassIds } from '@/services/instructor-scope';
import { promoteMember } from '@/services/belts';
import {
  createWaiver,
  bulkSendWaiverLinks,
  exportWaiverSignaturesCsv,
  getMemberWaiverSignatures,
  getWaiver,
  getWaiverCompletionStats,
  getWaiverSignatures,
  listWaivers,
  listMembersWithWaiverGaps,
  signWaiver,
  toggleWaiverStatus,
  type Waiver,
} from '@/services/waivers';
import {
  inviteStaffMember,
  listStaffMembers,
  removeStaffMember,
  updateStaffRole,
} from '@/services/staff';
import { inviteMemberToPortal } from '@/services/member-invite';
import { sendWaiverLinkToMember } from '@/services/waiver-reminders';
import { sendMemberNotification } from '@/services/notifications';
import { checkRateLimit } from '@/lib/rate-limit';
import type { StaffRole } from '@/lib/auth/staff';
import type { Database } from '@/types/database';
import {
  createCrmNote,
  deleteCrmNote,
  listLeadNotes,
  listMemberNotes,
  toggleCrmNotePin,
  type CrmNote,
  type CrmNoteType,
} from '@/services/crm-notes';
import {
  createEmergencyContact,
  deleteEmergencyContact,
  listEmergencyContacts,
  type EmergencyContact,
} from '@/services/emergency-contacts';
import {
  addMemberToWaitlist,
  listClassWaitlist,
  removeFromWaitlist,
  type ClassWaitlistEntry,
} from '@/services/class-waitlist';
import { importMembersFromRows, listImportJobs, importLeadsFromRows, getImportJobErrors, rollbackImportJob, type ImportJob } from '@/services/migration';
import { setPlanActive } from '@/services/plans';
import { getLatestSnapshot, saveDailySnapshot } from '@/services/business-assistant';
import { listCampaigns, createCampaign, sendCampaign, requestReview } from '@/services/marketing';
import { listProducts, createProduct, listOrders } from '@/services/merchandise';
import { listAuditEvents } from '@/services/audit';
import { computeBillingMetrics } from '@/services/billing-metrics';
import { listLocations, createLocation, deleteLocation } from '@/services/gym-locations';
import { fulfillOrder } from '@/services/merchandise';
import {
  getOrCreateTodaySession,
  listSessionAttendance,
  markSessionAttendance,
  removeSessionAttendance,
} from '@/services/class-sessions';
import { listKnowledge, upsertKnowledge, deleteKnowledge } from '@/services/ai-knowledge';
import { listConversations } from '@/services/ai-front-desk';
import { listInboxItems, getConversationMessages } from '@/services/inbox';
import { listBlogPosts, createBlogPost, publishBlogPost, deleteBlogPost } from '@/services/blog';
import { getGbpConnectionStatus, getGbpOAuthUrl, syncDirectoryListings } from '@/services/gbp';
import {
  listPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  listCoaches,
  createCoach,
  updateCoach,
  deleteCoach,
  addGalleryImage,
  createReview,
} from '@/services/gym-content';
import { updateMemberStripes } from '@/services/belts';
import { updateClass } from '@/services/classes';

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
  rows: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    belt_rank?: string;
    status?: string;
    external_id?: string;
  }[];
  fileName?: string;
  dryRun?: boolean;
}): Promise<ActionResult<{ jobId: string; success: number; errors: { row: number; message: string }[] }>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const limit = await checkRateLimit(`import:${auth.gymId}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { ok: false, error: 'Import rate limit exceeded. Try again in an hour.' };
    }
    const result = await importMembersFromRows(auth.gymId, input.rows, {
      fileName: input.fileName,
      createdBy: auth.user.id,
      dryRun: input.dryRun,
    });
    revalidatePath('/migration');
    revalidatePath('/members');
    return { ok: true, data: result };
  } catch (error) {
    return toActionError(error);
  }
}


export async function importLeadsCsvAction(input: {
  rows: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    source?: string;
    notes?: string;
  }[];
  fileName?: string;
  dryRun?: boolean;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const limit = await checkRateLimit(`import:${auth.gymId}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { ok: false as const, error: 'Import rate limit exceeded. Try again in an hour.' };
    }
    const result = await importLeadsFromRows(auth.gymId, input.rows, {
      fileName: input.fileName,
      createdBy: auth.user.id,
      dryRun: input.dryRun,
    });
    revalidatePath('/migration');
    revalidatePath('/leads');
    return { ok: true as const, data: result };
  } catch (error) {
    return toActionError(error);
  }
}


export async function importAttendanceCsvAction(input: {
  rows: {
    email?: string;
    external_id?: string;
    checked_in_at: string;
    notes?: string;
  }[];
  fileName?: string;
  dryRun?: boolean;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const limit = await checkRateLimit(`import:${auth.gymId}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { ok: false as const, error: 'Import rate limit exceeded. Try again in an hour.' };
    }
    const { importAttendanceFromRows } = await import('@/services/migration');
    const result = await importAttendanceFromRows(auth.gymId, input.rows, {
      fileName: input.fileName,
      createdBy: auth.user.id,
      dryRun: input.dryRun,
    });
    revalidatePath('/migration');
    revalidatePath('/attendance');
    return { ok: true as const, data: result };
  } catch (error) {
    return toActionError(error);
  }
}


export async function importBeltHistoryCsvAction(input: {
  rows: {
    email?: string;
    external_id?: string;
    from_belt?: string;
    to_belt: string;
    promoted_at: string;
    notes?: string;
  }[];
  fileName?: string;
  dryRun?: boolean;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const limit = await checkRateLimit(`import:${auth.gymId}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { ok: false as const, error: 'Import rate limit exceeded. Try again in an hour.' };
    }
    const { importBeltHistoryFromRows } = await import('@/services/migration');
    const result = await importBeltHistoryFromRows(auth.gymId, input.rows, {
      fileName: input.fileName,
      createdBy: auth.user.id,
      dryRun: input.dryRun,
    });
    revalidatePath('/migration');
    revalidatePath('/belts');
    return { ok: true as const, data: result };
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


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

export async function promoteMemberAction(input: {
  memberId: string;
  fromBelt: string;
  toBelt: string;
  notes?: string;
  ceremonyDate?: string | null;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'belts.promote' });
    await promoteMember({
      ...input,
      gymId: auth.gymId,
      actorId: auth.user.id,
      allowDemotion: auth.role === 'admin',
    });
    revalidatePath('/belts');
    revalidatePath('/members');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function undoPromotionAction(promotionId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { undoPromotion } = await import('@/services/belts');
    await undoPromotion(auth.gymId, promotionId, auth.user.id);
    revalidatePath('/belts');
    revalidatePath('/members');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listBeltRequirementsAction(): Promise<
  ActionResult<import('@/services/belts').BeltRequirementRow[]>
> {
  try {
    const auth = await requireStaffSession();
    const { listBeltRequirements } = await import('@/services/belts');
    const rows = await listBeltRequirements(auth.gymId);
    return { ok: true, data: rows };
  } catch (error) {
    return toActionError(error);
  }
}


export async function saveBeltRequirementAction(input: {
  belt: string;
  minAttendance: number;
  minDaysAtRank: number;
  techniquesChecklist?: string | null;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'settings.write' });
    const { upsertBeltRequirement } = await import('@/services/belts');
    await upsertBeltRequirement({ ...input, gymId: auth.gymId });
    revalidatePath('/belts');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getPromotionReadinessAction(): Promise<
  ActionResult<import('@/services/belts').MemberReadiness[]>
> {
  try {
    const auth = await requireStaffSession({ capability: 'members.read' });
    const { getPromotionReadiness } = await import('@/services/belts');
    const rows = await getPromotionReadiness(auth.gymId);
    return { ok: true, data: rows };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getGymBeltSystemAction(): Promise<
  ActionResult<import('@/lib/belt-systems').BeltSystem>
> {
  try {
    const auth = await requireStaffSession();
    const { getGymBeltSystem } = await import('@/services/belts');
    const system = await getGymBeltSystem(auth.gymId);
    return { ok: true, data: system };
  } catch (error) {
    return toActionError(error);
  }
}

export async function exportMembersByBeltCsvAction(): Promise<ActionResult<string>> {
  try {
    const auth = await requireStaffSession({ capability: 'reports.read' });
    const { exportMembersByBeltCsv } = await import('@/services/belts');
    const csv = await exportMembersByBeltCsv(auth.gymId);
    return { ok: true, data: csv };
  } catch (error) {
    return toActionError(error);
  }
}


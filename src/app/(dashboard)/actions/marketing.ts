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

export async function listCampaignsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listCampaigns(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function createCampaignAction(input: {
  name: string;
  subject: string;
  bodyHtml: string;
  audience: string;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const campaign = await createCampaign({ ...input, gymId: auth.gymId });
    revalidatePath('/marketing');
    return { ok: true as const, data: campaign };
  } catch (error) {
    return toActionError(error);
  }
}


export async function sendCampaignAction(campaignId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await sendCampaign(auth.gymId, campaignId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function scheduleCampaignAction(
  campaignId: string,
  scheduledAt: string
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { scheduleCampaign } = await import('@/services/marketing');
    await scheduleCampaign(auth.gymId, campaignId, scheduledAt);
    revalidatePath('/marketing');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function cancelScheduledCampaignAction(campaignId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { cancelScheduledCampaign } = await import('@/services/marketing');
    await cancelScheduledCampaign(auth.gymId, campaignId);
    revalidatePath('/marketing');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function requestReviewAction(memberId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await getMember(auth.gymId, memberId);
    await requestReview(auth.gymId, memberId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


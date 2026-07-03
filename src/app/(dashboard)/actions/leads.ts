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
import { createLead, convertLeadToMember, updateLeadStatus, updateLeadNotes, assignLead, getMarketingFunnel, getLeadSourceStats, listLeads, type LeadSummary } from '@/services/leads';
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

export async function listLeadsAction(): Promise<ActionResult<LeadSummary[]>> {
  try {
    const auth = await requireStaffSession({ capability: 'leads.read' });
    const leads = await listLeads(auth.gymId);
    return { ok: true, data: leads };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createLeadAction(input: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source?: string;
  interestedIn?: string;
}): Promise<ActionResult<LeadSummary>> {
  try {
    const auth = await requireStaffSession({ capability: 'leads.write' });
    const lead = await createLead({ ...input, gymId: auth.gymId });
    revalidatePath('/leads');
    return { ok: true, data: lead };
  } catch (error) {
    return toActionError(error);
  }
}


export async function updateLeadStatusAction(
  leadId: string,
  status: string
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'leads.write' });
    await updateLeadStatus(auth.gymId, leadId, status);
    revalidatePath('/leads');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function updateLeadNotesAction(
  leadId: string,
  notes: string
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'leads.write' });
    await updateLeadNotes(auth.gymId, leadId, notes);
    revalidatePath('/leads');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function assignLeadAction(
  leadId: string,
  staffId: string | null
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'leads.write' });
    await assignLead(auth.gymId, leadId, staffId);
    revalidatePath('/leads');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function convertLeadAction(leadId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'leads.write' });
    await convertLeadToMember(auth.gymId, leadId);
    revalidatePath('/leads');
    revalidatePath('/members');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listLeadNotesAction(leadId: string): Promise<ActionResult<CrmNote[]>> {
  try {
    const auth = await requireStaffSession({ capability: 'leads.read' });
    const notes = await listLeadNotes(auth.gymId, leadId);
    return { ok: true, data: notes };
  } catch (error) {
    return toActionError(error);
  }
}


export async function createLeadNoteAction(input: {
  leadId: string;
  body: string;
  noteType?: CrmNoteType;
}): Promise<ActionResult<CrmNote>> {
  try {
    const auth = await requireStaffSession({ capability: 'leads.write' });
    const note = await createCrmNote({
      gymId: auth.gymId,
      authorId: auth.user.id,
      leadId: input.leadId,
      body: input.body,
      noteType: input.noteType,
    });
    revalidatePath('/leads');
    return { ok: true, data: note };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getMarketingFunnelAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await getMarketingFunnel(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getLeadSourceStatsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await getLeadSourceStats(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


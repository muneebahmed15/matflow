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

export async function createMemberAction(
  input: Omit<CreateMemberInput, 'gymId'>
): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await requireStaffSession({ capability: 'members.write' });
    const member = await createMember({ ...input, gymId: auth.gymId });
    revalidatePath('/members');
    return { ok: true, data: { id: member.id } };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listMembersAction(): Promise<ActionResult<MemberSummary[]>> {
  try {
    const auth = await requireStaffSession();
    const members = await listMembers(auth.gymId);
    return { ok: true, data: members };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listFamiliesAction(): Promise<
  ActionResult<{ id: string; family_name: string }[]>
> {
  try {
    const auth = await requireStaffSession();
    const families = await listFamilies(auth.gymId);
    return { ok: true, data: families };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getMemberAction(memberId: string): Promise<ActionResult<MemberDetail>> {
  try {
    const auth = await requireStaffSession();
    const member = await getMember(auth.gymId, memberId);
    return { ok: true, data: member };
  } catch (error) {
    return toActionError(error);
  }
}


export async function updateMemberAction(
  memberId: string,
  fields: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    belt_rank: string;
    status: string;
  }>
): Promise<ActionResult<MemberDetail>> {
  try {
    const auth = await requireStaffSession({ capability: 'members.write' });
    const member = await updateMember(auth.gymId, memberId, fields);
    revalidatePath('/members');
    revalidatePath(`/members/${memberId}`);
    return { ok: true, data: member };
  } catch (error) {
    return toActionError(error);
  }
}


export async function deleteMemberAction(memberId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'members.write' });
    await deleteMember(auth.gymId, memberId);
    revalidatePath('/members');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getMemberWaiverSignaturesAction(
  memberId: string
): Promise<ActionResult<unknown[]>> {
  try {
    const auth = await requireStaffSession();
    await getMember(auth.gymId, memberId);
    const signatures = await getMemberWaiverSignatures(memberId);
    return { ok: true, data: signatures };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getMemberTimelineAction(
  memberId: string
): Promise<ActionResult<import('@/services/member-timeline').TimelineEvent[]>> {
  try {
    const auth = await requireStaffSession({ capability: 'members.read' });
    const { getMemberTimeline } = await import('@/services/member-timeline');
    const events = await getMemberTimeline(auth.gymId, memberId);
    return { ok: true, data: events };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getWaiverComplianceAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof listMembersWithWaiverGaps>>>
> {
  try {
    const auth = await requireStaffSession({ capability: 'members.read' });
    const gaps = await listMembersWithWaiverGaps(auth.gymId);
    return { ok: true, data: gaps };
  } catch (error) {
    return toActionError(error);
  }
}


export async function exportMembersCsvAction(): Promise<ActionResult<string>> {
  try {
    const auth = await requireStaffSession({ capability: 'members.read' });
    const csv = await exportMembersCsv(auth.gymId);
    return { ok: true, data: csv };
  } catch (error) {
    return toActionError(error);
  }
}


export async function archiveMemberAction(memberId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'members.write' });
    await archiveMember(auth.gymId, memberId);
    revalidatePath('/members');
    revalidatePath(`/members/${memberId}`);
    return { ok: true };
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


export async function inviteMemberToPortalAction(
  memberId: string
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    const limit = await checkRateLimit(`member-invite:${auth.user.id}`, 30, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { ok: false, error: 'Too many invites. Try again later.' };
    }
    await inviteMemberToPortal({ gymId: auth.gymId, memberId });
    revalidatePath(`/members/${memberId}`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function sendWaiverLinkAction(memberId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    const limit = await checkRateLimit(`waiver-link:${auth.user.id}`, 30, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { ok: false, error: 'Too many waiver emails. Try again later.' };
    }
    await sendWaiverLinkToMember({ gymId: auth.gymId, memberId });
    revalidatePath(`/members/${memberId}`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listMemberNotesAction(
  memberId: string
): Promise<ActionResult<CrmNote[]>> {
  try {
    const auth = await requireStaffSession();
    await getMember(auth.gymId, memberId);
    const notes = await listMemberNotes(auth.gymId, memberId);
    return { ok: true, data: notes };
  } catch (error) {
    return toActionError(error);
  }
}


export async function createMemberNoteAction(input: {
  memberId: string;
  body: string;
  noteType?: CrmNoteType;
}): Promise<ActionResult<CrmNote>> {
  try {
    const auth = await requireStaffSession();
    await getMember(auth.gymId, input.memberId);
    const note = await createCrmNote({
      gymId: auth.gymId,
      authorId: auth.user.id,
      memberId: input.memberId,
      body: input.body,
      noteType: input.noteType,
    });
    revalidatePath(`/members/${input.memberId}`);
    return { ok: true, data: note };
  } catch (error) {
    return toActionError(error);
  }
}


export async function deleteMemberNoteAction(
  memberId: string,
  noteId: string
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await getMember(auth.gymId, memberId);
    await deleteCrmNote(auth.gymId, noteId);
    revalidatePath(`/members/${memberId}`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function toggleMemberNotePinAction(
  memberId: string,
  noteId: string,
  isPinned: boolean
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await getMember(auth.gymId, memberId);
    await toggleCrmNotePin(auth.gymId, noteId, isPinned);
    revalidatePath(`/members/${memberId}`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listEmergencyContactsAction(
  memberId: string
): Promise<ActionResult<EmergencyContact[]>> {
  try {
    const auth = await requireStaffSession();
    await getMember(auth.gymId, memberId);
    const contacts = await listEmergencyContacts(auth.gymId, memberId);
    return { ok: true, data: contacts };
  } catch (error) {
    return toActionError(error);
  }
}


export async function createEmergencyContactAction(input: {
  memberId: string;
  fullName: string;
  phone: string;
  relationship: string;
  isPrimary?: boolean;
}): Promise<ActionResult<EmergencyContact>> {
  try {
    const auth = await requireStaffSession();
    await getMember(auth.gymId, input.memberId);
    const contact = await createEmergencyContact({
      gymId: auth.gymId,
      memberId: input.memberId,
      fullName: input.fullName,
      phone: input.phone,
      relationship: input.relationship,
      isPrimary: input.isPrimary,
    });
    revalidatePath(`/members/${input.memberId}`);
    return { ok: true, data: contact };
  } catch (error) {
    return toActionError(error);
  }
}


export async function deleteEmergencyContactAction(
  memberId: string,
  contactId: string
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await getMember(auth.gymId, memberId);
    await deleteEmergencyContact(auth.gymId, contactId);
    revalidatePath(`/members/${memberId}`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function updateMemberStripesAction(input: {
  memberId: string;
  stripeCount: number;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await updateMemberStripes({ ...input, gymId: auth.gymId });
    revalidatePath(`/members/${input.memberId}`);
    revalidatePath('/belts');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


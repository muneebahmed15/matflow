'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/staff';
import { isServiceError } from '@/services/errors';
import {
  createMember,
  deleteMember,
  getMember,
  listFamilies,
  listMembers,
  updateMember,
  type CreateMemberInput,
  type MemberDetail,
  type MemberSummary,
} from '@/services/members';
import { getGymSettings, updateGymSettings, type GymSettings } from '@/services/gym';
import { createLead, convertLeadToMember, updateLeadStatus, getMarketingFunnel, getLeadSourceStats } from '@/services/leads';
import { createClass, deleteClass, listClassesForStaff } from '@/services/classes';
import { getInstructorScopedClassIds } from '@/services/instructor-scope';
import { promoteMember } from '@/services/belts';
import {
  createWaiver,
  getMemberWaiverSignatures,
  getWaiver,
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
import { importMembersFromRows, listImportJobs, importLeadsFromRows, getImportJobErrors, type ImportJob } from '@/services/migration';
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
  listCoaches,
  createCoach,
  addGalleryImage,
  createReview,
} from '@/services/gym-content';
import { updateMemberStripes } from '@/services/belts';
import { updateClass } from '@/services/classes';

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function toActionError<T = void>(error: unknown): ActionResult<T> {
  if (isServiceError(error)) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: 'Something went wrong' };
}

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

export async function getGymSettingsAction(): Promise<ActionResult<GymSettings>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const settings = await getGymSettings(auth.gymId);
    return { ok: true, data: settings };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateGymSettingsAction(input: {
  name: string;
  slug: string;
  kioskEnabled: boolean;
  websiteEnabled?: boolean;
  storeEnabled?: boolean;
  aiFrontDeskEnabled?: boolean;
  dailyDigestEnabled?: boolean;
  logoUrl?: string | null;
  primaryColor?: string | null;
  tagline?: string | null;
  aboutText?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  addressLine1?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  customDomain?: string | null;
  whiteLabelEnabled?: boolean;
  storeReturnPolicy?: string | null;
  ga4MeasurementId?: string | null;
  metaPixelId?: string | null;
  googlePlaceId?: string | null;
  reviewCheckinThreshold?: number;
  requireWaiverForCheckin?: boolean;
}): Promise<ActionResult<GymSettings>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const settings = await updateGymSettings(auth.gymId, input);
    revalidatePath('/settings');
    return { ok: true, data: settings };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listStaffAction(): Promise<
  ActionResult<
    {
      id: string;
      user_id: string;
      role: string;
      full_name: string;
      created_at: string;
    }[]
  >
> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const staff = await listStaffMembers(auth.gymId);
    return { ok: true, data: staff };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listWaiversAction(): Promise<ActionResult<Waiver[]>> {
  try {
    const auth = await requireStaffSession();
    const waivers = await listWaivers(auth.gymId);
    return { ok: true, data: waivers };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getWaiverAction(waiverId: string): Promise<ActionResult<Waiver>> {
  try {
    const auth = await requireStaffSession();
    const waiver = await getWaiver(auth.gymId, waiverId);
    return { ok: true, data: waiver };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getWaiverSignaturesAction(waiverId: string): Promise<ActionResult<unknown[]>> {
  try {
    const auth = await requireStaffSession();
    await getWaiver(auth.gymId, waiverId);
    const signatures = await getWaiverSignatures(waiverId);
    return { ok: true, data: signatures };
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

export async function signWaiverAction(input: {
  waiverId: string;
  memberId: string;
  signedName: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await getWaiver(auth.gymId, input.waiverId);
    await getMember(auth.gymId, input.memberId);
    await signWaiver({
      waiverId: input.waiverId,
      memberId: input.memberId,
      gymId: auth.gymId,
      signedName: input.signedName,
    });
    try {
      await sendMemberNotification({
        gymId: auth.gymId,
        memberId: input.memberId,
        type: 'waiver_signed',
      });
    } catch {
      // Best-effort notification.
    }
    revalidatePath('/waivers');
    revalidatePath(`/members/${input.memberId}`);
    return { ok: true };
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
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'leads.write' });
    await createLead({ ...input, gymId: auth.gymId });
    revalidatePath('/leads');
    return { ok: true };
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

export async function createClassAction(input: {
  name: string;
  instructor: string;
  instructorStaffId?: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  capacity: number;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'classes.manage' });
    await createClass({ ...input, gymId: auth.gymId });
    revalidatePath('/classes');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listClassesAction(): Promise<
  ActionResult<Database['public']['Tables']['classes']['Row'][]>
> {
  try {
    const auth = await requireStaffSession();
    const scoped = await getInstructorScopedClassIds(auth);
    const classes = await listClassesForStaff(auth.gymId, scoped);
    return { ok: true, data: classes };
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

export async function deleteClassAction(classId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await deleteClass(auth.gymId, classId);
    revalidatePath('/classes');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function promoteMemberAction(input: {
  memberId: string;
  fromBelt: string;
  toBelt: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await promoteMember({ ...input, gymId: auth.gymId });
    revalidatePath('/belts');
    revalidatePath('/members');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createWaiverAction(input: {
  title: string;
  body: string;
  expiresAfterDays?: number | null;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await createWaiver({
      ...input,
      gymId: auth.gymId,
      expiresAfterDays: input.expiresAfterDays,
    });
    revalidatePath('/waivers');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleWaiverStatusAction(
  waiverId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await toggleWaiverStatus(auth.gymId, waiverId, isActive);
    revalidatePath('/waivers');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function inviteStaffAction(input: {
  email: string;
  fullName: string;
  role: StaffRole;
}): Promise<ActionResult<{ staffRoleId: string }>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const limit = await checkRateLimit(`staff-invite:${auth.user.id}`, 20, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { ok: false, error: 'Too many invites. Try again later.' };
    }

    const result = await inviteStaffMember({
      gymId: auth.gymId,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
    });
    revalidatePath('/staff');
    return { ok: true, data: { staffRoleId: result.staffRoleId } };
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

export async function removeStaffAction(staffRoleId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await removeStaffMember(auth.gymId, staffRoleId, auth.user.id);
    revalidatePath('/staff');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateStaffRoleAction(
  staffRoleId: string,
  role: StaffRole
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await updateStaffRole(auth.gymId, staffRoleId, role);
    revalidatePath('/staff');
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

export async function listClassWaitlistAction(
  classId: string
): Promise<ActionResult<ClassWaitlistEntry[]>> {
  try {
    const auth = await requireStaffSession();
    const entries = await listClassWaitlist(auth.gymId, classId);
    return { ok: true, data: entries };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addToClassWaitlistAction(input: {
  classId: string;
  memberId: string;
}): Promise<ActionResult<ClassWaitlistEntry>> {
  try {
    const auth = await requireStaffSession();
    const entry = await addMemberToWaitlist({
      gymId: auth.gymId,
      classId: input.classId,
      memberId: input.memberId,
    });
    revalidatePath('/classes');
    return { ok: true, data: entry };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeFromClassWaitlistAction(
  waitlistId: string
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await removeFromWaitlist(auth.gymId, waitlistId);
    revalidatePath('/classes');
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

export async function getImportErrorsAction(jobId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await getImportJobErrors(jobId, auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getBusinessInsightsAction() {
  try {
    const auth = await requireStaffSession({ capability: 'reports.read' });
    return { ok: true as const, data: await getLatestSnapshot(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function refreshBusinessSnapshotAction(): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await saveDailySnapshot(auth.gymId);
    revalidatePath('/insights');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

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

export async function listProductsAction() {
  try {
    const auth = await requireStaffSession({ capability: 'shop.read' });
    return { ok: true as const, data: await listProducts(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createProductAction(input: {
  name: string;
  description?: string;
  sku?: string;
  priceCents: number;
  category?: string;
  inventoryCount?: number;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const product = await createProduct({ ...input, gymId: auth.gymId });
    revalidatePath('/shop');
    return { ok: true as const, data: product };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listOrdersAction() {
  try {
    const auth = await requireStaffSession({ capability: 'shop.read' });
    return { ok: true as const, data: await listOrders(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listProgramsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listPrograms(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createProgramAction(input: {
  name: string;
  description?: string;
  ageGroup?: string;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const program = await createProgram({ ...input, gymId: auth.gymId });
    revalidatePath('/website-content');
    return { ok: true as const, data: program };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createCoachAction(input: {
  name: string;
  bio?: string;
  beltRank?: string;
  specialties?: string;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const coach = await createCoach({ ...input, gymId: auth.gymId });
    revalidatePath('/website-content');
    return { ok: true as const, data: coach };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addGalleryImageAction(input: { imageUrl: string; caption?: string }) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await addGalleryImage({ ...input, gymId: auth.gymId });
    revalidatePath('/website-content');
    return { ok: true as const };
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

export async function updateClassAction(
  classId: string,
  input: {
    name?: string;
    instructor?: string;
    instructorStaffId?: string | null;
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
    capacity?: number;
  }
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'classes.manage' });
    await updateClass(auth.gymId, classId, input);
    revalidatePath('/classes');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listAuditEventsAction() {
  try {
    const auth = await requireStaffSession({ capability: 'reports.read' });
    return { ok: true as const, data: await listAuditEvents(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getBillingMetricsAction() {
  try {
    const auth = await requireStaffSession({ capability: 'billing.read' });
    return { ok: true as const, data: await computeBillingMetrics(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listLocationsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listLocations(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createLocationAction(input: {
  name: string;
  addressLine1?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  isPrimary?: boolean;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const data = await createLocation({ gymId: auth.gymId, ...input });
    revalidatePath('/settings');
    return { ok: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteLocationAction(locationId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await deleteLocation(auth.gymId, locationId);
    revalidatePath('/settings');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

export async function fulfillOrderAction(orderId: string, trackingNumber?: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await fulfillOrder(auth.gymId, orderId, trackingNumber);
    revalidatePath('/shop');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getClassSessionAction(classId: string, instructor?: string) {
  try {
    const auth = await requireStaffSession();
    const session = await getOrCreateTodaySession(auth.gymId, classId, instructor);
    const attendance = await listSessionAttendance(session.id, auth.gymId);
    return { ok: true as const, data: { session, attendance } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markClassSessionAttendanceAction(sessionId: string, memberId: string) {
  try {
    const auth = await requireStaffSession();
    await markSessionAttendance({ gymId: auth.gymId, sessionId, memberId });
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeClassSessionAttendanceAction(sessionId: string, memberId: string) {
  try {
    const auth = await requireStaffSession();
    await removeSessionAttendance(auth.gymId, sessionId, memberId);
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listAiKnowledgeAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listKnowledge(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function upsertAiKnowledgeAction(input: { topic: string; content: string }) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const data = await upsertKnowledge({ gymId: auth.gymId, ...input });
    revalidatePath('/ai-desk');
    return { ok: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteAiKnowledgeAction(knowledgeId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await deleteKnowledge(auth.gymId, knowledgeId);
    revalidatePath('/ai-desk');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listAiConversationsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listConversations(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listInboxAction() {
  try {
    const auth = await requireStaffSession({ capability: 'marketing.read' });
    return { ok: true as const, data: await listInboxItems(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getConversationMessagesAction(conversationId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await getConversationMessages(conversationId, auth.gymId) };
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

export async function listBlogPostsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listBlogPosts(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createBlogPostAction(input: {
  title: string;
  excerpt?: string;
  bodyHtml: string;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const post = await createBlogPost({ ...input, gymId: auth.gymId });
    revalidatePath('/website-content');
    return { ok: true as const, data: post };
  } catch (error) {
    return toActionError(error);
  }
}

export async function publishBlogPostAction(postId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await publishBlogPost(auth.gymId, postId);
    revalidatePath('/website-content');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteBlogPostAction(postId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await deleteBlogPost(auth.gymId, postId);
    revalidatePath('/website-content');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getGbpStatusAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const status = await getGbpConnectionStatus(auth.gymId);
    const oauthUrl = getGbpOAuthUrl(auth.gymId);
    return { ok: true as const, data: { ...status, oauthUrl } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function syncDirectoryListingsAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await syncDirectoryListings(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

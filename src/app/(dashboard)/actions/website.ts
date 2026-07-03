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


export async function updateProgramAction(input: {
  programId: string;
  name?: string;
  description?: string | null;
  ageGroup?: string | null;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const program = await updateProgram({ ...input, gymId: auth.gymId });
    revalidatePath('/website-content');
    return { ok: true as const, data: program };
  } catch (error) {
    return toActionError(error);
  }
}


export async function deleteProgramAction(programId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await deleteProgram(auth.gymId, programId);
    revalidatePath('/website-content');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listCoachesAction() {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true as const, data: await listCoaches(auth.gymId) };
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


export async function updateCoachAction(input: {
  coachId: string;
  name?: string;
  bio?: string | null;
  beltRank?: string | null;
  specialties?: string | null;
}) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const coach = await updateCoach({ ...input, gymId: auth.gymId });
    revalidatePath('/website-content');
    return { ok: true as const, data: coach };
  } catch (error) {
    return toActionError(error);
  }
}


export async function deleteCoachAction(coachId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    await deleteCoach(auth.gymId, coachId);
    revalidatePath('/website-content');
    return { ok: true as const };
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


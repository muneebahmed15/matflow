'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';


import { createMember, archiveMember, deleteMember, exportMembersCsv, getMember, listFamilies, listMembers, updateMember, type CreateMemberInput, type MemberDetail, type MemberSummary } from '@/services/members';






import { getMemberWaiverSignatures, listMembersWithWaiverGaps } from '@/services/waivers';


import { inviteMemberToPortal } from '@/services/member-invite';

import { sendWaiverLinkToMember } from '@/services/waiver-reminders';


import { checkRateLimit } from '@/lib/rate-limit';



import { createCrmNote, deleteCrmNote, listMemberNotes, toggleCrmNotePin, type CrmNote, type CrmNoteType } from '@/services/crm-notes';

import { createEmergencyContact, deleteEmergencyContact, listEmergencyContacts, type EmergencyContact } from '@/services/emergency-contacts';


















import { updateMemberStripes } from '@/services/belts';



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

export async function listActiveMembersAction(): Promise<ActionResult<MemberSummary[]>> {
  try {
    const auth = await requireStaffSession();
    const { listActiveMembers } = await import('@/services/members');
    const members = await listActiveMembers(auth.gymId);
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


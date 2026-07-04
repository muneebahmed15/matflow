'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';




import { createLead, convertLeadToMember, updateLeadStatus, updateLeadNotes, assignLead, getMarketingFunnel, getLeadSourceStats, listLeads, type LeadSummary } from '@/services/leads';












import { createCrmNote, deleteCrmNote, listLeadNotes, toggleCrmNotePin, type CrmNote, type CrmNoteType } from '@/services/crm-notes';






















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

export async function deleteLeadNoteAction(leadId: string, noteId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'leads.write' });
    await deleteCrmNote(auth.gymId, noteId);
    revalidatePath('/leads');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleLeadNotePinAction(
  leadId: string,
  noteId: string,
  isPinned: boolean
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'leads.write' });
    await toggleCrmNotePin(auth.gymId, noteId, isPinned);
    revalidatePath('/leads');
    return { ok: true };
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


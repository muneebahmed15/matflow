'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/staff';
import {
  createGymEvent,
  deleteGymEvent,
  listGymEvents,
  type GymEvent,
  type GymEventType,
} from '@/services/gym-events';
import {
  createCompetition,
  deleteCompetition,
  listCompetitions,
  type Competition,
} from '@/services/competitions';
import { listMembers, type MemberSummary } from '@/services/members';
import { type ActionResult, toActionError } from './_shared';

export async function listGymEventsAction(): Promise<ActionResult<GymEvent[]>> {
  try {
    const auth = await requireStaffSession();
    const events = await listGymEvents(auth.gymId);
    return { ok: true, data: events };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createGymEventAction(input: {
  title: string;
  eventType: GymEventType | string;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
  capacity?: number | null;
}): Promise<ActionResult<GymEvent>> {
  try {
    const auth = await requireStaffSession();
    const event = await createGymEvent({ ...input, gymId: auth.gymId });
    revalidatePath('/events');
    return { ok: true, data: event };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteGymEventAction(eventId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await deleteGymEvent(auth.gymId, eventId);
    revalidatePath('/events');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listCompetitionsAction(): Promise<ActionResult<Competition[]>> {
  try {
    const auth = await requireStaffSession();
    const rows = await listCompetitions(auth.gymId);
    return { ok: true, data: rows };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listCompetitionMembersAction(): Promise<ActionResult<MemberSummary[]>> {
  try {
    const auth = await requireStaffSession();
    const members = await listMembers(auth.gymId);
    return { ok: true, data: members };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createCompetitionAction(input: {
  name: string;
  memberId?: string | null;
  eventDate?: string | null;
  division?: string | null;
  result?: string | null;
  notes?: string | null;
}): Promise<ActionResult<Competition>> {
  try {
    const auth = await requireStaffSession();
    const row = await createCompetition({ ...input, gymId: auth.gymId });
    revalidatePath('/competitions');
    return { ok: true, data: row };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteCompetitionAction(competitionId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession();
    await deleteCompetition(auth.gymId, competitionId);
    revalidatePath('/competitions');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

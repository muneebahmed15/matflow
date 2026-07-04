'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';





import { createClass, createClassSeries, deleteClass, deleteClassSeries, duplicateClass, listClassesForStaff } from '@/services/classes';

import { getInstructorScopedClassIds } from '@/services/instructor-scope';









import type { Database } from '@/types/database';



import { addMemberToWaitlist, listClassWaitlist, removeFromWaitlist, type ClassWaitlistEntry } from '@/services/class-waitlist';










import { getOrCreateTodaySession, listSessionAttendance, markSessionAttendance, removeSessionAttendance } from '@/services/class-sessions';








import { updateClass } from '@/services/classes';


import { type ActionResult, toActionError } from './_shared';

export async function createClassAction(input: {
  name: string;
  description?: string;
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


export async function createClassSeriesAction(input: {
  name: string;
  description?: string;
  instructor: string;
  instructorStaffId?: string | null;
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  capacity: number;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'classes.manage' });
    await createClassSeries({ ...input, gymId: auth.gymId });
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


export async function getEnrollmentCountsAction(): Promise<
  ActionResult<Record<string, number>>
> {
  try {
    const auth = await requireStaffSession();
    const { getEnrollmentCounts } = await import('@/services/class-enrollment');
    const counts = await getEnrollmentCounts(auth.gymId);
    return { ok: true, data: counts };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getClassAttendanceReportAction(days = 30): Promise<
  ActionResult<import('@/services/class-dropin').ClassAttendanceReport[]>
> {
  try {
    const auth = await requireStaffSession();
    const { getClassAttendanceReport } = await import('@/services/class-dropin');
    const report = await getClassAttendanceReport(auth.gymId, days);
    return { ok: true, data: report };
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


export async function deleteClassSeriesAction(seriesId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'classes.manage' });
    await deleteClassSeries(auth.gymId, seriesId);
    revalidatePath('/classes');
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


export async function updateClassAction(
  classId: string,
  input: {
    name?: string;
    description?: string | null;
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


export async function duplicateClassAction(
  classId: string,
  targetDayOfWeek: string
): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'classes.manage' });
    await duplicateClass(auth.gymId, classId, targetDayOfWeek);
    revalidatePath('/classes');
    return { ok: true };
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


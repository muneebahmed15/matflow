'use server';

import { revalidatePath } from 'next/cache';

import { requireStaffSession } from '@/lib/auth/staff';





import { createClass, createClassSeries, deleteClass, deleteClassSeries, duplicateClass, listClassesForStaff, updateClass } from '@/services/classes';
import {
  cancelClassOnDate,
  listClassScheduleExceptions,
  restoreClassOnDate,
} from '@/services/class-schedule-exceptions';

import { getInstructorScopedClassIds, assertStaffClassAccess, assertStaffSessionAccess } from '@/services/instructor-scope';









import type { Database } from '@/types/database';



import { addMemberToWaitlist, listClassWaitlist, removeFromWaitlist, type ClassWaitlistEntry } from '@/services/class-waitlist';










import { getOrCreateTodaySession, listSessionAttendance, markSessionAttendance, removeSessionAttendance, updateSessionSubstitute } from '@/services/class-sessions';








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
  categoryTag?: string | null;
  color?: string | null;
  overbookAllowance?: number;
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
  categoryTag?: string | null;
  color?: string | null;
  overbookAllowance?: number;
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
    categoryTag?: string | null;
    color?: string | null;
    overbookAllowance?: number;
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


export async function listClassScheduleExceptionsAction(): Promise<
  ActionResult<import('@/services/class-schedule-exceptions').ClassScheduleException[]>
> {
  try {
    const auth = await requireStaffSession();
    const today = new Date().toISOString().slice(0, 10);
    const exceptions = await listClassScheduleExceptions(auth.gymId, { fromDate: today });
    return { ok: true, data: exceptions };
  } catch (error) {
    return toActionError(error);
  }
}


export async function cancelClassDateAction(input: {
  classId: string;
  exceptionDate: string;
  reason?: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'classes.manage' });
    await cancelClassOnDate({
      gymId: auth.gymId,
      classId: input.classId,
      exceptionDate: input.exceptionDate,
      reason: input.reason,
    });
    revalidatePath('/classes');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function restoreClassDateAction(input: {
  classId: string;
  exceptionDate: string;
}): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ capability: 'classes.manage' });
    await restoreClassOnDate(auth.gymId, input.classId, input.exceptionDate);
    revalidatePath('/classes');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function updateClassSessionSubstituteAction(
  sessionId: string,
  input: { substituteInstructor?: string | null; substituteStaffId?: string | null }
) {
  try {
    const auth = await requireStaffSession({ capability: 'classes.manage' });
    const session = await updateSessionSubstitute(auth.gymId, sessionId, input);
    revalidatePath('/classes');
    return { ok: true as const, data: session };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getClassSessionAction(classId: string, instructor?: string) {
  try {
    const auth = await requireStaffSession();
    await assertStaffClassAccess(auth, classId);
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
    await assertStaffSessionAccess(auth, sessionId);
    await markSessionAttendance({ gymId: auth.gymId, sessionId, memberId });
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}


export async function removeClassSessionAttendanceAction(sessionId: string, memberId: string) {
  try {
    const auth = await requireStaffSession();
    await assertStaffSessionAccess(auth, sessionId);
    await removeSessionAttendance(auth.gymId, sessionId, memberId, { staffRole: auth.role });
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listScheduleTemplateGymsAction(): Promise<
  ActionResult<{ id: string; name: string; slug: string }[]>
> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { listSiblingGyms } = await import('@/services/gym');
    return { ok: true, data: await listSiblingGyms(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function copyScheduleFromGymAction(
  sourceGymId: string
): Promise<ActionResult<{ copied: number }>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true, capability: 'classes.manage' });
    const { copyScheduleFromGym } = await import('@/services/classes');
    const result = await copyScheduleFromGym(auth.gymId, sourceGymId);
    revalidatePath('/classes');
    return { ok: true, data: result };
  } catch (error) {
    return toActionError(error);
  }
}


export async function getClassRevenueReportAction(): Promise<
  ActionResult<import('@/services/class-revenue').ClassRevenueAttribution[]>
> {
  try {
    const auth = await requireStaffSession({ capability: 'classes.manage' });
    const { getClassRevenueReport } = await import('@/services/class-revenue');
    return { ok: true, data: await getClassRevenueReport(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listScheduleTemplatesAction(): Promise<
  ActionResult<import('@/services/class-schedule-templates').ClassScheduleTemplate[]>
> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { listScheduleTemplates } = await import('@/services/class-schedule-templates');
    return { ok: true, data: await listScheduleTemplates(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function saveScheduleTemplateAction(input: {
  name: string;
  seasonLabel?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}): Promise<ActionResult<import('@/services/class-schedule-templates').ClassScheduleTemplate>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true, capability: 'classes.manage' });
    const { saveScheduleAsTemplate } = await import('@/services/class-schedule-templates');
    const template = await saveScheduleAsTemplate(auth.gymId, input);
    revalidatePath('/classes');
    return { ok: true, data: template };
  } catch (error) {
    return toActionError(error);
  }
}


export async function applyScheduleTemplateAction(
  templateId: string,
  replaceActive = false
): Promise<ActionResult<{ created: number; deactivated: number }>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true, capability: 'classes.manage' });
    const { applyScheduleTemplate } = await import('@/services/class-schedule-templates');
    const result = await applyScheduleTemplate(auth.gymId, templateId, { replaceActive });
    revalidatePath('/classes');
    return { ok: true, data: result };
  } catch (error) {
    return toActionError(error);
  }
}


export async function deleteScheduleTemplateAction(templateId: string): Promise<ActionResult> {
  try {
    const auth = await requireStaffSession({ adminOnly: true, capability: 'classes.manage' });
    const { deleteScheduleTemplate } = await import('@/services/class-schedule-templates');
    await deleteScheduleTemplate(auth.gymId, templateId);
    revalidatePath('/classes');
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}


export async function listClassStaffPermissionsAction(classId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { listClassStaffPermissions } = await import('@/services/class-staff-permissions');
    return { ok: true as const, data: await listClassStaffPermissions(auth.gymId, classId) };
  } catch (error) {
    return toActionError(error);
  }
}


export async function grantClassStaffPermissionAction(classId: string, staffId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { grantClassStaffPermission } = await import('@/services/class-staff-permissions');
    const permission = await grantClassStaffPermission(auth.gymId, classId, staffId);
    revalidatePath('/classes');
    return { ok: true as const, data: permission };
  } catch (error) {
    return toActionError(error);
  }
}


export async function revokeClassStaffPermissionAction(classId: string, staffId: string) {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { revokeClassStaffPermission } = await import('@/services/class-staff-permissions');
    await revokeClassStaffPermission(auth.gymId, classId, staffId);
    revalidatePath('/classes');
    return { ok: true as const };
  } catch (error) {
    return toActionError(error);
  }
}


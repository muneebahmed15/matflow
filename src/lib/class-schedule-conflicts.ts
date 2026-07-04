export type ClassScheduleSlot = {
  id: string;
  name: string;
  instructorStaffId: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
};

export type InstructorConflict = {
  classId: string;
  className: string;
  conflictsWithId: string;
  conflictsWithName: string;
  dayOfWeek: string;
};

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function schedulesOverlap(
  a: Pick<ClassScheduleSlot, 'startTime' | 'endTime'>,
  b: Pick<ClassScheduleSlot, 'startTime' | 'endTime'>
): boolean {
  const aStart = parseTimeToMinutes(a.startTime);
  const aEnd = parseTimeToMinutes(a.endTime);
  const bStart = parseTimeToMinutes(b.startTime);
  const bEnd = parseTimeToMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

export function findInstructorConflictsForClass(
  classes: ClassScheduleSlot[],
  candidate: ClassScheduleSlot
): InstructorConflict[] {
  if (!candidate.instructorStaffId) return [];

  const conflicts: InstructorConflict[] = [];
  for (const other of classes) {
    if (other.id === candidate.id) continue;
    if (other.instructorStaffId !== candidate.instructorStaffId) continue;
    if (other.dayOfWeek !== candidate.dayOfWeek) continue;
    if (!schedulesOverlap(candidate, other)) continue;

    conflicts.push({
      classId: candidate.id,
      className: candidate.name,
      conflictsWithId: other.id,
      conflictsWithName: other.name,
      dayOfWeek: candidate.dayOfWeek,
    });
  }
  return conflicts;
}

export function detectAllInstructorConflicts(classes: ClassScheduleSlot[]): InstructorConflict[] {
  const seen = new Set<string>();
  const all: InstructorConflict[] = [];

  for (const cls of classes) {
    for (const conflict of findInstructorConflictsForClass(classes, cls)) {
      const key = [conflict.classId, conflict.conflictsWithId].sort().join(':');
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(conflict);
    }
  }

  return all;
}

export function formatInstructorConflictMessage(conflicts: InstructorConflict[]): string {
  const first = conflicts[0];
  if (!first) return 'Instructor schedule conflict.';
  return `Instructor conflict with "${first.conflictsWithName}" on ${first.dayOfWeek}.`;
}

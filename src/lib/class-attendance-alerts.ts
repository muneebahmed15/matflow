export const LOW_ATTENDANCE_MIN_SESSIONS = 2;
export const LOW_ATTENDANCE_CAPACITY_RATIO = 0.3;

export function isLowAttendanceClass(input: {
  avgPerSession: number;
  capacity: number;
  sessions: number;
  minSessions?: number;
  capacityRatio?: number;
}): boolean {
  const minSessions = input.minSessions ?? LOW_ATTENDANCE_MIN_SESSIONS;
  const capacityRatio = input.capacityRatio ?? LOW_ATTENDANCE_CAPACITY_RATIO;

  if (input.sessions < minSessions) return false;
  if (input.capacity <= 0) return false;

  return input.avgPerSession / input.capacity < capacityRatio;
}

export function lowAttendanceDescription(capacityRatio = LOW_ATTENDANCE_CAPACITY_RATIO): string {
  const pct = Math.round(capacityRatio * 100);
  return `Average attendance below ${pct}% of capacity over the last 30 days.`;
}

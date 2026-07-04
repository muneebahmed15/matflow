import { describe, expect, it } from 'vitest';
import {
  isLowAttendanceClass,
  LOW_ATTENDANCE_CAPACITY_RATIO,
  LOW_ATTENDANCE_MIN_SESSIONS,
} from '@/lib/class-attendance-alerts';

describe('isLowAttendanceClass', () => {
  it('flags classes below 30% of capacity', () => {
    expect(
      isLowAttendanceClass({
        avgPerSession: 2,
        capacity: 20,
        sessions: 4,
      })
    ).toBe(true);
  });

  it('ignores classes with too few sessions', () => {
    expect(
      isLowAttendanceClass({
        avgPerSession: 1,
        capacity: 20,
        sessions: LOW_ATTENDANCE_MIN_SESSIONS - 1,
      })
    ).toBe(false);
  });

  it('ignores classes above the capacity threshold', () => {
    expect(
      isLowAttendanceClass({
        avgPerSession: 8,
        capacity: 20,
        sessions: 4,
      })
    ).toBe(false);
  });

  it('uses the configured ratio boundary', () => {
    const thresholdAvg = 20 * LOW_ATTENDANCE_CAPACITY_RATIO;
    expect(
      isLowAttendanceClass({
        avgPerSession: thresholdAvg - 0.1,
        capacity: 20,
        sessions: 3,
      })
    ).toBe(true);
  });
});

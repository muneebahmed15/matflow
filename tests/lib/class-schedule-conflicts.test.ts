import { describe, expect, it } from 'vitest';
import {
  detectAllInstructorConflicts,
  findInstructorConflictsForClass,
  schedulesOverlap,
} from '@/lib/class-schedule-conflicts';

describe('class-schedule-conflicts', () => {
  it('detects overlapping time ranges', () => {
    expect(
      schedulesOverlap({ startTime: '09:00', endTime: '10:00' }, { startTime: '09:30', endTime: '10:30' })
    ).toBe(true);
    expect(
      schedulesOverlap({ startTime: '09:00', endTime: '10:00' }, { startTime: '10:00', endTime: '11:00' })
    ).toBe(false);
  });

  it('finds conflicts for the same instructor on the same day', () => {
    const classes = [
      {
        id: 'a',
        name: 'Fundamentals',
        instructorStaffId: 'staff-1',
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
      },
      {
        id: 'b',
        name: 'Advanced',
        instructorStaffId: 'staff-1',
        dayOfWeek: 'Monday',
        startTime: '09:30',
        endTime: '10:30',
      },
    ];

    const conflicts = findInstructorConflictsForClass(classes, classes[0]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictsWithName).toBe('Advanced');
  });

  it('ignores different instructors and different days', () => {
    const classes = [
      {
        id: 'a',
        name: 'Fundamentals',
        instructorStaffId: 'staff-1',
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
      },
      {
        id: 'b',
        name: 'Advanced',
        instructorStaffId: 'staff-2',
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
      },
      {
        id: 'c',
        name: 'Noon class',
        instructorStaffId: 'staff-1',
        dayOfWeek: 'Tuesday',
        startTime: '09:00',
        endTime: '10:00',
      },
    ];

    expect(findInstructorConflictsForClass(classes, classes[0])).toHaveLength(0);
    expect(detectAllInstructorConflicts(classes)).toHaveLength(0);
  });
});

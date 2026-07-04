import { describe, expect, it } from 'vitest';
import { getGymLocalClock, isClassInReminderWindow } from '@/lib/class-reminder-window';

describe('isClassInReminderWindow', () => {
  it('matches classes starting in about two hours', () => {
    const now = new Date('2026-07-06T17:00:00.000Z'); // Monday 10:00 PT (PDT)
    expect(
      isClassInReminderWindow({
        dayOfWeek: 'Monday',
        startTime: '12:00',
        timezone: 'America/Los_Angeles',
        reminderHours: 2,
        now,
      })
    ).toBe(true);
  });

  it('ignores classes on other weekdays', () => {
    const now = new Date('2026-07-06T17:00:00.000Z');
    expect(
      isClassInReminderWindow({
        dayOfWeek: 'Tuesday',
        startTime: '12:00',
        timezone: 'America/Los_Angeles',
        reminderHours: 2,
        now,
      })
    ).toBe(false);
  });
});

describe('getGymLocalClock', () => {
  it('returns a YYYY-MM-DD date key in the gym timezone', () => {
    const clock = getGymLocalClock('America/Los_Angeles', new Date('2026-07-06T17:00:00.000Z'));
    expect(clock.weekday).toBe('Monday');
    expect(clock.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

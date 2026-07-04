import { describe, expect, it } from 'vitest';
import { filterTodaysCheckInClasses, weekdayNameForDate } from '@/lib/todays-classes';

describe('filterTodaysCheckInClasses', () => {
  const monday = new Date('2026-07-06T15:00:00.000Z');

  it('returns classes for the current weekday only', () => {
    expect(weekdayNameForDate(monday)).toBe('Monday');
    const result = filterTodaysCheckInClasses(
      [
        {
          id: 'c1',
          name: 'BJJ',
          day_of_week: 'Monday',
          start_time: '09:00',
          end_time: '10:00',
          category_tag: 'BJJ',
          color: '#3B82F6',
        },
        {
          id: 'c2',
          name: 'Kids',
          day_of_week: 'Tuesday',
          start_time: '16:00',
          end_time: '17:00',
          category_tag: null,
          color: null,
        },
      ],
      new Set(),
      monday
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('c1');
  });

  it('excludes cancelled classes for today', () => {
    const result = filterTodaysCheckInClasses(
      [
        {
          id: 'c1',
          name: 'BJJ',
          day_of_week: 'Monday',
          start_time: '09:00',
          end_time: '10:00',
          category_tag: null,
          color: null,
        },
      ],
      new Set(['c1:2026-07-06']),
      monday
    );
    expect(result).toHaveLength(0);
  });
});

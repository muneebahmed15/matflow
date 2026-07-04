import { describe, expect, it } from 'vitest';
import {
  buildWeeklyRecurrenceRule,
  daysFromRecurrenceRule,
  formatSeriesLabel,
  sortDays,
} from '@/lib/class-recurrence';

describe('class-recurrence', () => {
  it('builds a weekly RRULE from day names', () => {
    expect(buildWeeklyRecurrenceRule(['Monday', 'Wednesday', 'Friday'])).toBe(
      'FREQ=WEEKLY;BYDAY=MO,WE,FR'
    );
  });

  it('deduplicates days when building RRULE', () => {
    expect(buildWeeklyRecurrenceRule(['Monday', 'Monday', 'Tuesday'])).toBe('FREQ=WEEKLY;BYDAY=MO,TU');
  });

  it('throws when no valid days are provided', () => {
    expect(() => buildWeeklyRecurrenceRule([])).toThrow(/At least one valid day/);
  });

  it('parses BYDAY codes back to English day names in weekday order', () => {
    expect(daysFromRecurrenceRule('FREQ=WEEKLY;BYDAY=FR,MO,WE')).toEqual([
      'Monday',
      'Wednesday',
      'Friday',
    ]);
  });

  it('formats a readable series label', () => {
    expect(formatSeriesLabel('FREQ=WEEKLY;BYDAY=MO,WE')).toBe('Weekly · Mon, Wed');
    expect(formatSeriesLabel(null)).toBe('Weekly series');
  });

  it('sorts days in calendar order', () => {
    expect(sortDays(['Friday', 'Monday', 'Wednesday'])).toEqual(['Monday', 'Wednesday', 'Friday']);
  });
});

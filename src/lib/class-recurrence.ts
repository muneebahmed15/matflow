const DAY_TO_BYDAY: Record<string, string> = {
  Monday: 'MO',
  Tuesday: 'TU',
  Wednesday: 'WE',
  Thursday: 'TH',
  Friday: 'FR',
  Saturday: 'SA',
  Sunday: 'SU',
};

const BYDAY_TO_DAY: Record<string, string> = Object.fromEntries(
  Object.entries(DAY_TO_BYDAY).map(([day, code]) => [code, day])
);

const WEEKDAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Build a weekly RRULE string from English day names. */
export function buildWeeklyRecurrenceRule(days: string[]): string {
  const codes = [...new Set(days)]
    .map((day) => DAY_TO_BYDAY[day])
    .filter(Boolean);
  if (codes.length === 0) {
    throw new Error('At least one valid day is required for a recurrence rule.');
  }
  return `FREQ=WEEKLY;BYDAY=${codes.join(',')}`;
}

/** Parse BYDAY codes from a stored RRULE into English day names. */
export function daysFromRecurrenceRule(rule: string | null | undefined): string[] {
  if (!rule) return [];
  const match = rule.match(/BYDAY=([A-Z,]+)/i);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((code) => BYDAY_TO_DAY[code.toUpperCase()])
    .filter(Boolean)
    .sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b));
}

export function formatSeriesLabel(rule: string | null | undefined): string {
  const days = daysFromRecurrenceRule(rule);
  if (days.length === 0) return 'Weekly series';
  return `Weekly · ${days.map((d) => d.slice(0, 3)).join(', ')}`;
}

export function sortDays(days: string[]): string[] {
  return [...new Set(days)].sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b));
}

export { WEEKDAY_ORDER as CLASS_WEEKDAYS };

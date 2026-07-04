const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Next calendar date (YYYY-MM-DD) for a weekday name; includes today when it matches. */
export function nextDateForWeekday(dayName: string | null, from = new Date()): string | null {
  if (!dayName) return null;
  const target = WEEKDAYS.indexOf(dayName);
  if (target < 0) return null;
  const diff = (target - from.getDay() + 7) % 7;
  const date = new Date(from.getTime() + diff * 86_400_000);
  return date.toISOString().slice(0, 10);
}

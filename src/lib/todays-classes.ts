const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export type CheckInClassOption = {
  id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  category_tag: string | null;
  color: string | null;
};

export function weekdayNameForDate(date = new Date()): string {
  return WEEKDAYS[date.getDay()];
}

export function dateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Classes scheduled for today, excluding cancelled dates. */
export function filterTodaysCheckInClasses(
  classes: (CheckInClassOption & { day_of_week: string | null })[],
  cancelledKeys: Set<string>,
  today = new Date()
): CheckInClassOption[] {
  const dayName = weekdayNameForDate(today);
  const todayKey = dateKey(today);

  return classes
    .filter(
      (c) =>
        c.day_of_week === dayName && !cancelledKeys.has(`${c.id}:${todayKey}`)
    )
    .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
    .map(({ id, name, start_time, end_time, category_tag, color }) => ({
      id,
      name,
      start_time,
      end_time,
      category_tag,
      color,
    }));
}

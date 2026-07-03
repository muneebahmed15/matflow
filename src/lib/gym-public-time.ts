/** Format a HH:MM or HH:MM:SS time string for display in a gym timezone. */
export function formatClassTime(
  time: string | null | undefined,
  _timezone: string
): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = Number(hours);
  const minute = Number(minutes);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;

  // Class times are stored as gym-local wall clock (HH:MM), not UTC.
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

/** Format an ISO timestamp in the gym's timezone (6.17). */
export function formatTimestampInGymTimezone(
  iso: string | null | undefined,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }
): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: timezone }).format(date);
}

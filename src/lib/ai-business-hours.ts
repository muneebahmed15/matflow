/** Simple gym-hours check: Mon–Sat 6:00–21:00 in gym timezone. */
export function isGymLikelyOpen(timezone: string, now = new Date()): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '12');

    if (weekday === 'Sun') return false;
    return hour >= 6 && hour < 21;
  } catch {
    return true;
  }
}

export function defaultOffHoursMessage(gymName: string): string {
  return `Thanks for contacting ${gymName}! We're currently closed. Leave your question here and our team will follow up when we're open (Mon–Sat, 6am–9pm).`;
}

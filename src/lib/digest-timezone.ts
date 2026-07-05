/** True when the gym's local hour matches digest_hour (cron runs hourly). */
export function isDigestHourForGym(timezone: string, digestHour: number, now = new Date()): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const hour = Number(formatter.formatToParts(now).find((p) => p.type === 'hour')?.value ?? '-1');
    return hour === digestHour;
  } catch {
    return digestHour === 8;
  }
}

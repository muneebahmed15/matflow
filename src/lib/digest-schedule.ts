/** Whether digest should run for this gym at the current cron tick. */
export function shouldSendDigest(input: {
  timezone: string;
  digestHour: number;
  digestFrequency: 'daily' | 'weekly';
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: input.timezone,
      weekday: 'short',
      hour: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '-1');

    if (hour !== input.digestHour) return false;
    if (input.digestFrequency === 'weekly') {
      return weekday === 'Mon';
    }
    return true;
  } catch {
    return input.digestHour === 8 && input.digestFrequency === 'daily';
  }
}

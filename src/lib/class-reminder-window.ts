import { CLASS_WEEKDAYS } from '@/lib/class-recurrence';

export type GymLocalClock = {
  weekday: string;
  hour: number;
  minute: number;
  dateKey: string;
};

export function getGymLocalClock(timezone: string, now = new Date()): GymLocalClock {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const year = pick('year');
  const month = pick('month');
  const day = pick('day');
  const weekday = pick('weekday');
  const hour = Number(pick('hour'));
  const minute = Number(pick('minute'));

  return {
    weekday,
    hour: Number.isNaN(hour) ? 0 : hour,
    minute: Number.isNaN(minute) ? 0 : minute,
    dateKey: `${year}-${month}-${day}`,
  };
}

export function parseWallClockMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const [hours, minutes] = time.split(':');
  const hour = Number(hours);
  const minute = Number(minutes);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

/** True when a class starts approximately `reminderHours` from now (±30 min slack for hourly cron). */
export function isClassInReminderWindow(input: {
  dayOfWeek: string | null;
  startTime: string | null;
  timezone: string;
  reminderHours: number;
  now?: Date;
}): boolean {
  if (!input.dayOfWeek || !input.startTime || input.reminderHours <= 0) return false;
  if (!CLASS_WEEKDAYS.includes(input.dayOfWeek as (typeof CLASS_WEEKDAYS)[number])) {
    return false;
  }

  const local = getGymLocalClock(input.timezone, input.now);
  if (local.weekday !== input.dayOfWeek) return false;

  const classStart = parseWallClockMinutes(input.startTime);
  if (classStart === null) return false;

  const nowMinutes = local.hour * 60 + local.minute;
  const minutesUntilStart = classStart - nowMinutes;
  const targetMinutes = input.reminderHours * 60;

  return minutesUntilStart >= targetMinutes - 30 && minutesUntilStart <= targetMinutes + 30;
}

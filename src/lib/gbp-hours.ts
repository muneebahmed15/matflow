const DAY_TO_GBP: Record<string, string> = {
  Monday: 'MONDAY',
  Tuesday: 'TUESDAY',
  Wednesday: 'WEDNESDAY',
  Thursday: 'THURSDAY',
  Friday: 'FRIDAY',
  Saturday: 'SATURDAY',
  Sunday: 'SUNDAY',
};

export type ClassHourRow = {
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
};

export type GbpPeriod = {
  openDay: string;
  openTime: string;
  closeDay: string;
  closeTime: string;
};

function parseTimeMinutes(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function formatGbpTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Merge class schedule into GBP regularHours periods (earliest open, latest close per day). */
export function computeGbpHoursFromClasses(classes: ClassHourRow[]): GbpPeriod[] {
  const byDay = new Map<string, { open: number; close: number }>();

  for (const cls of classes) {
    const day = cls.day_of_week ?? '';
    const gbpDay = DAY_TO_GBP[day];
    if (!gbpDay) continue;

    const open = parseTimeMinutes(cls.start_time);
    const close = parseTimeMinutes(cls.end_time ?? cls.start_time);
    if (open === null || close === null) continue;

    const existing = byDay.get(gbpDay);
    if (!existing) {
      byDay.set(gbpDay, { open, close: Math.max(close, open + 60) });
    } else {
      byDay.set(gbpDay, {
        open: Math.min(existing.open, open),
        close: Math.max(existing.close, close),
      });
    }
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => Object.values(DAY_TO_GBP).indexOf(a) - Object.values(DAY_TO_GBP).indexOf(b))
    .map(([day, hours]) => ({
      openDay: day,
      openTime: formatGbpTime(hours.open),
      closeDay: day,
      closeTime: formatGbpTime(hours.close),
    }));
}

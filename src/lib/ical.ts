type ICalEvent = {
  uid: string;
  summary: string;
  description?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
};

const DAY_TO_BYDAY: Record<string, string> = {
  Monday: 'MO',
  Tuesday: 'TU',
  Wednesday: 'WE',
  Thursday: 'TH',
  Friday: 'FR',
  Saturday: 'SA',
  Sunday: 'SU',
};

function formatIcalTime(time: string): string {
  const [h, m] = time.split(':');
  return `${h?.padStart(2, '0') ?? '00'}${m?.padStart(2, '0') ?? '00'}00`;
}

export function buildWeeklyScheduleIcal(gymName: string, events: ICalEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MatFlow//Gym Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${gymName} Schedule`,
  ];

  for (const ev of events) {
    const byday = DAY_TO_BYDAY[ev.dayOfWeek];
    if (!byday) continue;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.uid}@matflow`,
      `SUMMARY:${ev.summary}`,
      ev.description ? `DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}` : '',
      `DTSTART;TZID=America/New_York:${formatIcalTime(ev.startTime)}`,
      `DTEND;TZID=America/New_York:${formatIcalTime(ev.endTime)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byday}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n');
}

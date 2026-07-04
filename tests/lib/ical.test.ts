import { describe, expect, it } from 'vitest';
import { buildGoogleCalendarSubscribeUrl, buildWeeklyScheduleIcal } from '@/lib/ical';

describe('buildWeeklyScheduleIcal', () => {
  it('uses the gym timezone in event timestamps', () => {
    const ical = buildWeeklyScheduleIcal(
      'Test Gym',
      [
        {
          uid: 'class-1',
          summary: 'BJJ Fundamentals',
          dayOfWeek: 'Monday',
          startTime: '09:00',
          endTime: '10:00',
        },
      ],
      'America/Los_Angeles'
    );

    expect(ical).toContain('X-WR-TIMEZONE:America/Los_Angeles');
    expect(ical).toContain('DTSTART;TZID=America/Los_Angeles:090000');
    expect(ical).toContain('DTEND;TZID=America/Los_Angeles:100000');
  });
});

describe('buildGoogleCalendarSubscribeUrl', () => {
  it('builds a Google Calendar subscribe URL from an HTTPS feed', () => {
    const url = buildGoogleCalendarSubscribeUrl('https://app.example.com/g/demo/schedule.ics');
    expect(url).toContain('calendar.google.com/calendar/r?cid=');
    expect(decodeURIComponent(url)).toContain('webcal://app.example.com/g/demo/schedule.ics');
  });
});

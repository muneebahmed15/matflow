import { describe, expect, it } from 'vitest';
import { defaultOffHoursMessage, isGymLikelyOpen } from '@/lib/ai-business-hours';

describe('isGymLikelyOpen', () => {
  it('returns false on Sunday in gym timezone', () => {
    const sundayNoonUtc = new Date('2026-07-05T16:00:00.000Z');
    expect(isGymLikelyOpen('America/New_York', sundayNoonUtc)).toBe(false);
  });

  it('returns true during weekday business hours', () => {
    const tuesdayNoonUtc = new Date('2026-07-07T16:00:00.000Z');
    expect(isGymLikelyOpen('America/New_York', tuesdayNoonUtc)).toBe(true);
  });

  it('returns false before opening on weekdays', () => {
    const tuesdayEarlyUtc = new Date('2026-07-07T08:00:00.000Z');
    expect(isGymLikelyOpen('America/New_York', tuesdayEarlyUtc)).toBe(false);
  });

  it('returns true for invalid timezone (fail open)', () => {
    expect(isGymLikelyOpen('Invalid/Zone')).toBe(true);
  });
});

describe('defaultOffHoursMessage', () => {
  it('includes gym name and hours hint', () => {
    const msg = defaultOffHoursMessage('Elite BJJ');
    expect(msg).toContain('Elite BJJ');
    expect(msg).toContain('Mon–Sat');
  });
});

import { describe, expect, it } from 'vitest';
import { isMinor } from '@/lib/member-age';
import { formatClassTime } from '@/lib/gym-public-time';

describe('isMinor', () => {
  it('returns false for adults', () => {
    expect(isMinor('2000-01-01')).toBe(false);
  });

  it('returns true for under 18', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 10);
    expect(isMinor(dob.toISOString().slice(0, 10))).toBe(true);
  });

  it('returns false for invalid dates', () => {
    expect(isMinor('not-a-date')).toBe(false);
    expect(isMinor(null)).toBe(false);
  });
});

describe('formatClassTime', () => {
  it('formats a time in the gym timezone', () => {
    const formatted = formatClassTime('18:30', 'America/New_York');
    expect(formatted).toMatch(/6:30/);
  });
});

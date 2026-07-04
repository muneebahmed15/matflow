import { describe, expect, it } from 'vitest';
import { nextDateForWeekday } from '@/lib/class-weekday-date';

describe('nextDateForWeekday', () => {
  it('returns the next matching weekday including today', () => {
    const monday = new Date('2026-07-06T12:00:00.000Z');
    expect(nextDateForWeekday('Monday', monday)).toBe('2026-07-06');
  });

  it('returns null for unknown day names', () => {
    expect(nextDateForWeekday('Funday')).toBeNull();
  });
});

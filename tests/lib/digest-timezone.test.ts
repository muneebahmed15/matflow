import { describe, expect, it } from 'vitest';
import { isDigestHourForGym } from '@/lib/digest-timezone';

describe('isDigestHourForGym', () => {
  it('matches gym local hour', () => {
    const noonUtc = new Date('2026-07-07T16:00:00.000Z');
    expect(isDigestHourForGym('America/New_York', 12, noonUtc)).toBe(true);
    expect(isDigestHourForGym('America/New_York', 8, noonUtc)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { effectiveEnrollmentLimit, isAtEnrollmentLimit } from '@/lib/class-capacity';

describe('effectiveEnrollmentLimit', () => {
  it('adds overbook allowance to capacity', () => {
    expect(effectiveEnrollmentLimit(20, 2)).toBe(22);
  });

  it('returns null for unlimited capacity', () => {
    expect(effectiveEnrollmentLimit(null, 2)).toBeNull();
    expect(effectiveEnrollmentLimit(0, 2)).toBeNull();
  });
});

describe('isAtEnrollmentLimit', () => {
  it('respects overbook allowance', () => {
    expect(isAtEnrollmentLimit(10, 10, 2)).toBe(false);
    expect(isAtEnrollmentLimit(10, 12, 2)).toBe(true);
  });
});

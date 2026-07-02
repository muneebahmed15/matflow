import { describe, expect, it } from 'vitest';
import { countThisMonth, computeStreak } from '@/lib/attendance-stats';

describe('countThisMonth', () => {
  it('counts check-ins in current month', () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString();
    expect(countThisMonth([thisMonth, lastMonth, thisMonth])).toBe(2);
  });
});

describe('computeStreak', () => {
  it('returns 0 when no recent check-ins', () => {
    const old = new Date();
    old.setDate(old.getDate() - 10);
    expect(computeStreak([old.toISOString()])).toBe(0);
  });

  it('counts consecutive days', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    expect(computeStreak([today.toISOString(), yesterday.toISOString()])).toBe(2);
  });
});

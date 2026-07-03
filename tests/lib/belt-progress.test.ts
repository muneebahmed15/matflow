import { describe, expect, it } from 'vitest';
import { getBeltProgress } from '@/lib/belt-progress';

describe('getBeltProgress', () => {
  it('calculates progress for white belt with stripes', () => {
    const progress = getBeltProgress('white', 2);
    expect(progress.nextBelt).toBe('blue');
    expect(progress.stripesUntilPromotion).toBe(2);
    expect(progress.progressPercent).toBeGreaterThan(0);
  });

  it('returns no next belt for black belt', () => {
    const progress = getBeltProgress('black', 4);
    expect(progress.nextBelt).toBeNull();
  });
});

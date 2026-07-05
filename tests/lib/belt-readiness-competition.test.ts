import { describe, expect, it } from 'vitest';
import { evaluateReadiness } from '@/lib/belt-systems';

describe('evaluateReadiness competition factor', () => {
  it('requires competition wins when configured', () => {
    const result = evaluateReadiness({
      belt: 'purple',
      daysAtRank: 400,
      attendanceSinceRank: 200,
      competitionWins: 0,
      requirement: {
        belt: 'purple',
        minAttendance: 150,
        minDaysAtRank: 365,
        minCompetitionWins: 1,
      },
    });

    expect(result.ready).toBe(false);
    expect(result.missingCompetitionWins).toBe(1);
  });

  it('applies competition attendance bonus', () => {
    const result = evaluateReadiness({
      belt: 'blue',
      daysAtRank: 400,
      attendanceSinceRank: 90,
      competitionWins: 2,
      requirement: {
        belt: 'blue',
        minAttendance: 100,
        minDaysAtRank: 365,
        competitionBonusAttendance: 5,
      },
    });

    expect(result.ready).toBe(true);
  });
});

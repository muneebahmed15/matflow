import { describe, expect, it } from 'vitest';
import {
  BELT_SYSTEMS,
  DEFAULT_BELT_SYSTEM,
  evaluateReadiness,
  isDemotion,
  isValidBelt,
  resolveBeltSystem,
} from '@/lib/belt-systems';

describe('resolveBeltSystem', () => {
  it('returns the preset for a known key', () => {
    expect(resolveBeltSystem('karate').label).toBe('Karate');
    expect(resolveBeltSystem('tkd').belts).toContain('red');
  });

  it('falls back to BJJ adult for unknown or missing keys', () => {
    expect(resolveBeltSystem('nonsense')).toBe(DEFAULT_BELT_SYSTEM);
    expect(resolveBeltSystem(null)).toBe(DEFAULT_BELT_SYSTEM);
  });

  it('prefers a valid custom order over the preset', () => {
    const system = resolveBeltSystem('karate', ['White', 'Red', 'Black']);
    expect(system.key).toBe('custom');
    expect(system.belts).toEqual(['white', 'red', 'black']);
  });

  it('ignores custom orders with fewer than two belts', () => {
    expect(resolveBeltSystem('karate', ['white']).label).toBe('Karate');
  });
});

describe('isValidBelt / isDemotion', () => {
  const bjj = BELT_SYSTEMS.bjj_adult;

  it('validates belts case-insensitively', () => {
    expect(isValidBelt(bjj, 'Purple')).toBe(true);
    expect(isValidBelt(bjj, 'red')).toBe(false);
  });

  it('detects demotions and same-rank moves', () => {
    expect(isDemotion(bjj, 'blue', 'white')).toBe(true);
    expect(isDemotion(bjj, 'blue', 'blue')).toBe(true);
    expect(isDemotion(bjj, 'blue', 'purple')).toBe(false);
  });
});

describe('evaluateReadiness', () => {
  it('is never ready without a configured requirement', () => {
    const result = evaluateReadiness({
      belt: 'white',
      daysAtRank: 1000,
      attendanceSinceRank: 500,
      requirement: null,
    });
    expect(result.ready).toBe(false);
  });

  it('is ready when both thresholds are met', () => {
    const result = evaluateReadiness({
      belt: 'white',
      daysAtRank: 400,
      attendanceSinceRank: 60,
      requirement: { belt: 'white', minAttendance: 50, minDaysAtRank: 365 },
    });
    expect(result.ready).toBe(true);
    expect(result.missingAttendance).toBe(0);
    expect(result.missingDays).toBe(0);
  });

  it('reports what is missing when not ready', () => {
    const result = evaluateReadiness({
      belt: 'white',
      daysAtRank: 100,
      attendanceSinceRank: 30,
      requirement: { belt: 'white', minAttendance: 50, minDaysAtRank: 365 },
    });
    expect(result.ready).toBe(false);
    expect(result.missingAttendance).toBe(20);
    expect(result.missingDays).toBe(265);
  });
});

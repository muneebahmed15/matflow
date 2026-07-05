export type BeltSystemKey = 'bjj_adult' | 'bjj_kids' | 'karate' | 'tkd';

export type BeltSystem = {
  key: BeltSystemKey | 'custom';
  label: string;
  belts: string[];
  maxStripes: number;
};

export const BELT_SYSTEMS: Record<BeltSystemKey, BeltSystem> = {
  bjj_adult: {
    key: 'bjj_adult',
    label: 'BJJ (Adult)',
    belts: ['white', 'blue', 'purple', 'brown', 'black'],
    maxStripes: 4,
  },
  bjj_kids: {
    key: 'bjj_kids',
    label: 'BJJ (Kids)',
    belts: ['white', 'grey', 'yellow', 'orange', 'green'],
    maxStripes: 4,
  },
  karate: {
    key: 'karate',
    label: 'Karate',
    belts: ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'red', 'black'],
    maxStripes: 0,
  },
  tkd: {
    key: 'tkd',
    label: 'Taekwondo',
    belts: ['white', 'yellow', 'green', 'blue', 'red', 'black'],
    maxStripes: 0,
  },
};

export const DEFAULT_BELT_SYSTEM = BELT_SYSTEMS.bjj_adult;

/**
 * Resolve a gym's belt system from its stored preset key and optional custom
 * belt order (belt_custom_order jsonb array of lowercase belt names).
 */
export function resolveBeltSystem(
  systemKey: string | null | undefined,
  customOrder?: unknown
): BeltSystem {
  if (Array.isArray(customOrder) && customOrder.length >= 2) {
    const belts = customOrder
      .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
      .map((b) => b.trim().toLowerCase());
    if (belts.length >= 2) {
      return { key: 'custom', label: 'Custom', belts, maxStripes: 4 };
    }
  }

  if (systemKey && systemKey in BELT_SYSTEMS) {
    return BELT_SYSTEMS[systemKey as BeltSystemKey];
  }
  return DEFAULT_BELT_SYSTEM;
}

export function beltIndex(system: BeltSystem, belt: string): number {
  return system.belts.indexOf(belt.trim().toLowerCase());
}

export function isValidBelt(system: BeltSystem, belt: string): boolean {
  return beltIndex(system, belt) >= 0;
}

/** true when moving from -> to goes backwards (or stays) in the belt order. */
export function isDemotion(system: BeltSystem, fromBelt: string, toBelt: string): boolean {
  const from = beltIndex(system, fromBelt);
  const to = beltIndex(system, toBelt);
  if (from < 0 || to < 0) return false;
  return to <= from;
}

export function nextBeltInSystem(system: BeltSystem, currentBelt: string): string | null {
  const idx = beltIndex(system, currentBelt);
  if (idx < 0 || idx >= system.belts.length - 1) return null;
  return system.belts[idx + 1];
}

export type BeltRequirement = {
  belt: string;
  minAttendance: number;
  minDaysAtRank: number;
  minCompetitionWins?: number;
  competitionBonusAttendance?: number;
};

export type ReadinessInput = {
  belt: string;
  daysAtRank: number;
  attendanceSinceRank: number;
  competitionWins?: number;
  requirement: BeltRequirement | null;
};

export type ReadinessResult = {
  ready: boolean;
  missingAttendance: number;
  missingDays: number;
  missingCompetitionWins: number;
};

/**
 * Pure promotion-eligibility evaluator. A member with no configured
 * requirement for their belt is never auto-flagged as ready.
 */
export function evaluateReadiness(input: ReadinessInput): ReadinessResult {
  if (!input.requirement) {
    return { ready: false, missingAttendance: 0, missingDays: 0, missingCompetitionWins: 0 };
  }

  const bonus =
    (input.requirement.competitionBonusAttendance ?? 0) * (input.competitionWins ?? 0);
  const effectiveAttendance = input.attendanceSinceRank + bonus;

  const missingAttendance = Math.max(
    0,
    input.requirement.minAttendance - effectiveAttendance
  );
  const missingDays = Math.max(0, input.requirement.minDaysAtRank - input.daysAtRank);
  const missingCompetitionWins = Math.max(
    0,
    (input.requirement.minCompetitionWins ?? 0) - (input.competitionWins ?? 0)
  );

  return {
    ready: missingAttendance === 0 && missingDays === 0 && missingCompetitionWins === 0,
    missingAttendance,
    missingDays,
    missingCompetitionWins,
  };
}

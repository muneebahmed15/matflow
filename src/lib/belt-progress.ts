const BELT_ORDER = ['white', 'blue', 'purple', 'brown', 'black'] as const;
const STRIPES_PER_BELT = 4;

export type BeltProgress = {
  currentBelt: string;
  stripeCount: number;
  nextBelt: string | null;
  stripesUntilPromotion: number;
  progressPercent: number;
};

export function getBeltProgress(beltRank: string, stripeCount: number): BeltProgress {
  const normalized = beltRank.toLowerCase().trim();
  const beltIndex = BELT_ORDER.indexOf(normalized as (typeof BELT_ORDER)[number]);
  const safeStripes = Math.max(0, Math.min(STRIPES_PER_BELT, stripeCount));

  if (beltIndex < 0) {
    return {
      currentBelt: beltRank,
      stripeCount: safeStripes,
      nextBelt: null,
      stripesUntilPromotion: 0,
      progressPercent: 0,
    };
  }

  const totalSteps = BELT_ORDER.length * (STRIPES_PER_BELT + 1);
  const currentStep = beltIndex * (STRIPES_PER_BELT + 1) + safeStripes;
  const nextBelt = beltIndex < BELT_ORDER.length - 1 ? BELT_ORDER[beltIndex + 1] : null;

  return {
    currentBelt: normalized,
    stripeCount: safeStripes,
    nextBelt,
    stripesUntilPromotion: STRIPES_PER_BELT - safeStripes,
    progressPercent: Math.round((currentStep / (totalSteps - 1)) * 100),
  };
}

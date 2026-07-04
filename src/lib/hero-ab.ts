export type HeroVariant = 'a' | 'b';

export function pickHeroVariant(cookieValue: string | null | undefined): HeroVariant {
  if (cookieValue === 'a' || cookieValue === 'b') return cookieValue;
  return Math.random() < 0.5 ? 'a' : 'b';
}

export function heroHeadline(
  variant: HeroVariant,
  defaultHeadline: string,
  variantBHeadline: string | null | undefined
): string {
  if (variant === 'b' && variantBHeadline?.trim()) return variantBHeadline.trim();
  return defaultHeadline;
}

export function heroSubheadline(
  variant: HeroVariant,
  defaultSubheadline: string | null | undefined,
  variantBSubheadline: string | null | undefined
): string | null {
  if (variant === 'b' && variantBSubheadline?.trim()) return variantBSubheadline.trim();
  return defaultSubheadline?.trim() || null;
}

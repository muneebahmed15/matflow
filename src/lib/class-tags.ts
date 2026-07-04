export const CLASS_CATEGORY_PRESETS = [
  'BJJ',
  'No-Gi',
  'Kids',
  'Muay Thai',
  'Open Mat',
  'Competition',
  'Fundamentals',
] as const;

export const CLASS_COLOR_PRESETS = [
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Purple', value: '#A855F7' },
  { label: 'Green', value: '#22C55E' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Teal', value: '#14B8A6' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Gray', value: '#6B7280' },
] as const;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function normalizeClassColor(color: string | null | undefined): string | null {
  if (!color?.trim()) return null;
  const trimmed = color.trim();
  if (!HEX_COLOR.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

export function normalizeCategoryTag(tag: string | null | undefined): string | null {
  if (!tag?.trim()) return null;
  return tag.trim().slice(0, 40);
}

export function classAccentColor(color: string | null | undefined, fallback = '#3B82F6'): string {
  return normalizeClassColor(color) ?? fallback;
}

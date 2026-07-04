export type PublicLocale = 'en' | 'es';

export type PublicTranslations = Partial<
  Record<
    PublicLocale,
    {
      tagline?: string;
      about_text?: string;
      hero_cta?: string;
    }
  >
>;

export function parsePublicTranslations(raw: unknown): PublicTranslations {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as PublicTranslations;
}

export function resolvePublicText(
  locale: PublicLocale,
  primary: string | null | undefined,
  translations: PublicTranslations,
  field: 'tagline' | 'about_text' | 'hero_cta'
): string | null {
  if (locale !== 'en') {
    const translated = translations[locale]?.[field];
    if (translated?.trim()) return translated.trim();
  }
  return primary?.trim() || null;
}

export const PUBLIC_LOCALE_LABELS: Record<PublicLocale, string> = {
  en: 'English',
  es: 'Español',
};

export function parsePublicLocale(value: string | null | undefined): PublicLocale {
  if (value === 'es') return 'es';
  return 'en';
}

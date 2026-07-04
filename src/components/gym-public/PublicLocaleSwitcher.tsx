'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { PUBLIC_LOCALE_LABELS, type PublicLocale } from '@/lib/public-i18n';

type Props = {
  currentLocale: PublicLocale;
};

export default function PublicLocaleSwitcher({ currentLocale }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setLocale = (locale: PublicLocale) => {
    const params = new URLSearchParams(searchParams.toString());
    if (locale === 'en') params.delete('lang');
    else params.set('lang', locale);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex items-center gap-1 text-xs">
      {(Object.keys(PUBLIC_LOCALE_LABELS) as PublicLocale[]).map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => setLocale(locale)}
          className={`px-2 py-1 rounded-md transition ${
            currentLocale === locale ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          {PUBLIC_LOCALE_LABELS[locale]}
        </button>
      ))}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicLocaleSwitcher from '@/components/gym-public/PublicLocaleSwitcher';
import { parsePublicLocale } from '@/lib/public-i18n';

type Props = {
  base: string;
  accent: string;
};

function PublicHeaderExtrasInner({ base, accent }: Props) {
  const searchParams = useSearchParams();
  const locale = parsePublicLocale(searchParams.get('lang'));

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Link
        href="/portal/login"
        className="hidden sm:inline text-sm text-white/60 hover:text-white px-2 py-2"
      >
        {locale === 'es' ? 'Miembros' : 'Member Login'}
      </Link>
      <PublicLocaleSwitcher currentLocale={locale} />
      <Link
        href={`${base}/trial`}
        className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition hover:opacity-90"
        style={{ backgroundColor: accent }}
      >
        {locale === 'es' ? 'Prueba gratis' : 'Book Free Trial'}
      </Link>
    </div>
  );
}

export default function PublicHeaderExtras(props: Props) {
  return (
    <Suspense fallback={null}>
      <PublicHeaderExtrasInner {...props} />
    </Suspense>
  );
}

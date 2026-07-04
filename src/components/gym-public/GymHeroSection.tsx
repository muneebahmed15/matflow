'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicGymProfile } from '@/lib/gym-public';
import { gymPrimaryColor } from '@/lib/gym-public';
import { pickHeroVariant, heroHeadline, heroSubheadline } from '@/lib/hero-ab';
import { parsePublicTranslations, resolvePublicText, type PublicLocale } from '@/lib/public-i18n';
import PublicGymImage from '@/components/gym-public/PublicGymImage';

type Props = {
  gym: PublicGymProfile;
  locale: PublicLocale;
};

const HERO_COOKIE = 'mf_hero_variant';

export default function GymHeroSection({ gym, locale }: Props) {
  const accent = gymPrimaryColor(gym.primary_color);
  const base = `/g/${gym.slug}`;
  const translations = parsePublicTranslations(gym.public_translations);
  const [variant, setVariant] = useState<'a' | 'b'>('a');

  useEffect(() => {
    if (!gym.hero_ab_enabled) return;
    const existing = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${HERO_COOKIE}=`))
      ?.split('=')[1];
    const picked = pickHeroVariant(existing);
    if (!existing) {
      document.cookie = `${HERO_COOKIE}=${picked}; path=/; max-age=2592000; SameSite=Lax`;
    }
    setVariant(picked);
  }, [gym.hero_ab_enabled]);

  const headline = heroHeadline(
    variant,
    gym.name,
    gym.hero_variant_b_headline
  );
  const subheadline = heroSubheadline(
    variant,
    resolvePublicText(locale, gym.tagline, translations, 'tagline'),
    gym.hero_variant_b_subheadline
  );
  const ctaLabel =
    resolvePublicText(locale, 'Book Free Trial', translations, 'hero_cta') ?? 'Book Free Trial';

  return (
    <section className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 text-center overflow-hidden rounded-3xl">
      {gym.hero_image_url ? (
        <>
          <div className="absolute inset-0 -z-10">
            <PublicGymImage
              src={gym.hero_image_url}
              alt=""
              fill
              className="object-cover opacity-40"
              sizes="(max-width: 768px) 100vw, 80rem"
            />
          </div>
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0A0A0A]/70 via-[#0A0A0A]/50 to-[#0A0A0A]" />
        </>
      ) : null}
      {gym.logo_url && (
        <PublicGymImage
          src={gym.logo_url}
          alt={gym.name}
          width={80}
          height={80}
          className="rounded-2xl mx-auto mb-6 object-cover"
        />
      )}
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{headline}</h1>
      {subheadline && (
        <p className="mt-4 text-lg text-white/50 max-w-xl mx-auto">{subheadline}</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href={`${base}/trial`}
          className="px-6 py-3 rounded-xl font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          {ctaLabel}
        </Link>
        <Link
          href={`${base}/schedule`}
          className="px-6 py-3 rounded-xl font-semibold border border-white/20 text-white/80 hover:bg-white/5 transition"
        >
          View Schedule
        </Link>
      </div>
    </section>
  );
}

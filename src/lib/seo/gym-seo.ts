import type { Metadata } from 'next';
import type { PublicGymProfile } from '@/lib/gym-public';
import { getPublicEnv } from '@/lib/env';

export function gymPublicUrl(gym: Pick<PublicGymProfile, 'slug'>, path = ''): string {
  const base = getPublicEnv().NEXT_PUBLIC_APP_URL;
  return `${base}/g/${gym.slug}${path}`;
}

export function buildGymPageMetadata(
  gym: PublicGymProfile,
  page: { title?: string; description?: string; path?: string }
): Metadata {
  const title = page.title ?? `${gym.name} | Martial Arts`;
  const description =
    page.description ?? gym.tagline ?? `Train at ${gym.name}. Book your free trial today.`;
  const url = gymPublicUrl(gym, page.path ?? '');

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      siteName: gym.name,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export function buildGymLocalBusinessJsonLd(gym: PublicGymProfile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: gym.name,
    description: gym.tagline ?? undefined,
    url: gymPublicUrl(gym),
    telephone: gym.contact_phone ?? undefined,
    email: gym.contact_email ?? undefined,
    address: gym.address_line1
      ? {
          '@type': 'PostalAddress',
          streetAddress: gym.address_line1,
          addressLocality: gym.address_city ?? undefined,
          addressRegion: gym.address_state ?? undefined,
          postalCode: gym.address_zip ?? undefined,
          addressCountry: 'US',
        }
      : undefined,
    sport: 'Brazilian Jiu-Jitsu',
  };
}

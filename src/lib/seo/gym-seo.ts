import type { Metadata } from 'next';
import type { PublicGymProfile } from '@/lib/gym-public';
import { getPublicEnv } from '@/lib/env';
import { getPublicGymBySlug } from '@/lib/gym-public';

export async function resolveGymPageMetadata(
  gymSlug: string,
  page: { title: string; description?: string; path: string }
): Promise<Metadata> {
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) return { title: 'Not found' };
  return buildGymPageMetadata(gym, page);
}

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
    icons: gym.favicon_url
      ? { icon: gym.favicon_url, shortcut: gym.favicon_url }
      : gym.logo_url
        ? { icon: gym.logo_url }
        : undefined,
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      siteName: gym.name,
      images: gym.hero_image_url
        ? [{ url: gym.hero_image_url, alt: gym.name }]
        : gym.logo_url
          ? [{ url: gym.logo_url, alt: gym.name }]
          : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: gym.hero_image_url
        ? [gym.hero_image_url]
        : gym.logo_url
          ? [gym.logo_url]
          : undefined,
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

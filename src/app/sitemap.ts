import type { MetadataRoute } from 'next'
import { absoluteUrl, publicRoutes } from '@/lib/seo/site'
import { getAdminClient } from '@/lib/supabase/admin'

const GYM_PUBLIC_PATHS = [
  '',
  '/about',
  '/programs',
  '/coaches',
  '/schedule',
  '/pricing',
  '/reviews',
  '/gallery',
  '/blog',
  '/contact',
  '/trial',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  const platformEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl(publicRoutes.home),
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl(publicRoutes.signup),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: absoluteUrl(publicRoutes.login),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: absoluteUrl(publicRoutes.portalSignup),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl(publicRoutes.portalLogin),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]

  try {
    const admin = getAdminClient()
    const { data: gyms } = await admin
      .from('gyms')
      .select('slug')
      .eq('website_enabled', true)

    const gymEntries: MetadataRoute.Sitemap = (gyms ?? []).flatMap((gym) =>
      GYM_PUBLIC_PATHS.map((path) => ({
        url: absoluteUrl(`/g/${gym.slug}${path}`),
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: path === '' ? 0.9 : 0.7,
      }))
    )

    return [...platformEntries, ...gymEntries]
  } catch {
    return platformEntries
  }
}

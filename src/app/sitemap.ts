import type { MetadataRoute } from 'next'
import { absoluteUrl, publicRoutes } from '@/lib/seo/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
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
}

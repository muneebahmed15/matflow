import type { MetadataRoute } from 'next'
import { absoluteUrl, privateRoutePrefixes, publicRoutes, siteConfig } from '@/lib/seo/site'

const aiCrawlers = [
  'GPTBot',
  'ChatGPT-User',
  'Google-Extended',
  'anthropic-ai',
  'ClaudeBot',
  'PerplexityBot',
  'Applebot-Extended',
]

export default function robots(): MetadataRoute.Robots {
  const sitemap = absoluteUrl('/sitemap.xml')

  const privateDisallows = [...privateRoutePrefixes]

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', publicRoutes.login, publicRoutes.signup, publicRoutes.portalLogin, publicRoutes.portalSignup],
        disallow: privateDisallows,
      },
      ...aiCrawlers.map((userAgent) => ({
        userAgent,
        allow: ['/', publicRoutes.login, publicRoutes.signup, publicRoutes.portalLogin, publicRoutes.portalSignup],
        disallow: privateDisallows,
      })),
    ],
    sitemap,
    host: siteConfig.url,
  }
}

import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/seo/site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.shortDescription,
    start_url: '/',
    display: 'standalone',
    background_color: siteConfig.themeColor,
    theme_color: siteConfig.themeColor,
    lang: siteConfig.language,
    categories: ['sports', 'business', 'productivity'],
  }
}

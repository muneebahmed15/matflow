import type { Metadata } from 'next'
import { absoluteUrl, siteConfig } from '@/lib/seo/site'

type PageMetadataOptions = {
  title?: string
  description?: string
  path?: string
  keywords?: string[]
  noIndex?: boolean
  openGraphType?: 'website' | 'article'
}

export function buildPageMetadata({
  title,
  description = siteConfig.description,
  path = '/',
  keywords = [...siteConfig.keywords],
  noIndex = false,
  openGraphType = 'website',
}: PageMetadataOptions = {}): Metadata {
  const canonical = absoluteUrl(path)
  const pageTitle = title ?? `${siteConfig.name} | ${siteConfig.tagline}`

  return {
    metadataBase: new URL(siteConfig.url),
    title: pageTitle,
    description,
    keywords,
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.name, url: siteConfig.url }],
    creator: siteConfig.publisher.name,
    publisher: siteConfig.publisher.name,
    category: siteConfig.category,
    alternates: {
      canonical,
    },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
    openGraph: {
      type: openGraphType,
      locale: siteConfig.locale,
      url: canonical,
      siteName: siteConfig.name,
      title: pageTitle,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      creator: '@matflow',
    },
    other: {
      'geo.region': 'US',
      'content-language': siteConfig.language,
    },
  }
}

export const rootMetadata: Metadata = {
  ...buildPageMetadata(),
  title: {
    default: `${siteConfig.name} | ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
}

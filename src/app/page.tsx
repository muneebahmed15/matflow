import LandingPage from '@/components/landing/LandingPage'
import JsonLd from '@/components/seo/JsonLd'
import { getHomePageJsonLd } from '@/lib/seo/json-ld'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const metadata = buildPageMetadata({
  path: '/',
})

export default function HomePage() {
  return (
    <>
      <JsonLd data={getHomePageJsonLd('/')} />
      <LandingPage />
    </>
  )
}

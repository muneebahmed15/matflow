import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Member Portal Sign In',
  description: 'Sign in to the MatFlow member portal to view attendance, waivers, and subscription details.',
  path: '/portal/login',
})

export default function PortalLoginLayout({ children }: { children: React.ReactNode }) {
  return children
}

import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Member Portal Sign Up',
  description: 'Join your academy on MatFlow to track training, sign waivers, and manage your BJJ membership.',
  path: '/portal/signup',
})

export default function PortalSignupLayout({ children }: { children: React.ReactNode }) {
  return children
}

import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Start Free Trial',
  description:
    'Create your free MatFlow account for Brazilian Jiu-Jitsu gym management, attendance tracking, belt promotions, and member portals.',
  path: '/signup',
})

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}

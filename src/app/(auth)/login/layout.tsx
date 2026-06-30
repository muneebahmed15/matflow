import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Sign In',
  description: 'Sign in to your MatFlow gym owner or staff account to manage your Brazilian Jiu-Jitsu academy.',
  path: '/login',
})

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}

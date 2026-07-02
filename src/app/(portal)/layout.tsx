import type { Metadata } from 'next'
import PortalShell from './PortalShell'
import { PortalMemberProvider } from '@/lib/portal-member-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalMemberProvider>
      <PortalShell>{children}</PortalShell>
    </PortalMemberProvider>
  )
}

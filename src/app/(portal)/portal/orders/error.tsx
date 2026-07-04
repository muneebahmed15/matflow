'use client'

import PortalSectionError from '@/components/portal/PortalSectionError'

export default function PortalSectionRouteError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <PortalSectionError {...props} section="Orders" />
}

'use client'

import ErrorState from '@/components/ErrorState'

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="py-12">
      <ErrorState
        message={error.message || 'Something went wrong in the member portal.'}
        onRetry={reset}
      />
    </div>
  )
}

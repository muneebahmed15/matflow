'use client'

import ErrorState from '@/components/ErrorState'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-8">
      <ErrorState
        message={error.message || 'Something went wrong in the dashboard.'}
        onRetry={reset}
      />
    </div>
  )
}

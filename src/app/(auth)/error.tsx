'use client'

import ErrorState from '@/components/ErrorState'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <ErrorState
        message={error.message || 'Something went wrong on the sign-in page.'}
        onRetry={reset}
      />
    </div>
  )
}

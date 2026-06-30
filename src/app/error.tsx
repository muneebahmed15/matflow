'use client'

import ErrorState from '@/components/ErrorState'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <ErrorState
          message={error.message || 'Something went wrong loading this page.'}
          onRetry={reset}
        />
      </div>
    </div>
  )
}

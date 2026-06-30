'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  message?: string
  onRetry?: () => void
}

export default function ErrorState({ message = 'Something went wrong.', onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <p className="text-white/60 font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition">
          <RefreshCw size={14} />
          Try again
        </button>
      )}
    </div>
  )
}

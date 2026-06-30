'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastType = 'success' | 'error' | 'info'

type ToastItem = {
  id: number
  message: string
  type: ToastType
}

export type ConfirmOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type AppUiContextValue = {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const AppUiContext = createContext<AppUiContextValue | null>(null)

export function useAppUi(): AppUiContextValue {
  const ctx = useContext(AppUiContext)
  if (!ctx) {
    throw new Error('useAppUi must be used within AppUiProvider')
  }
  return ctx
}

export function AppUiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null)
  const confirmResolver = useRef<((value: boolean) => void) | null>(null)
  const toastId = useRef(0)

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++toastId.current
      setToasts((prev) => [...prev, { id, message, type }])
      window.setTimeout(() => dismissToast(id), 4000)
    },
    [dismissToast]
  )

  const success = useCallback((message: string) => toast(message, 'success'), [toast])
  const error = useCallback((message: string) => toast(message, 'error'), [toast])

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options)
    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve
    })
  }, [])

  const closeConfirm = useCallback((result: boolean) => {
    confirmResolver.current?.(result)
    confirmResolver.current = null
    setConfirmState(null)
  }, [])

  const value = useMemo(
    () => ({ toast, success, error, confirm }),
    [toast, success, error, confirm]
  )

  return (
    <AppUiContext.Provider value={value}>
      {children}

      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl text-sm font-medium border shadow-lg backdrop-blur-sm ${
              item.type === 'success'
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : item.type === 'error'
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : 'bg-white/10 text-white border-white/20'
            }`}
          >
            {item.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4">
          <div
            className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <div>
              <h2 id="confirm-title" className="text-lg font-semibold text-white">
                {confirmState.title}
              </h2>
              <p className="text-white/60 text-sm mt-2">{confirmState.message}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition"
              >
                {confirmState.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition ${
                  confirmState.destructive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmState.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppUiContext.Provider>
  )
}

'use client'

import { useState } from 'react'
import { Pause, Play, RotateCcw, XCircle } from 'lucide-react'
import type { SubscriptionWithRelations } from '@/types/queries'
import {
  cancelStripeSubscription,
  pauseStripeSubscription,
  refundStripeSubscription,
} from '@/lib/api-client'

type Props = {
  subscription: SubscriptionWithRelations
  onUpdated: () => void
}

type ModalKind = 'cancel' | 'pause' | 'refund' | null

export default function SubscriptionActions({ subscription, onUpdated }: Props) {
  const [modal, setModal] = useState<ModalKind>(null)
  const [reason, setReason] = useState('')
  const [cancelImmediately, setCancelImmediately] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const stripeId = subscription.stripe_subscription_id
  const canManage = Boolean(stripeId) && !['cancelled', 'canceled'].includes(subscription.status)
  const isPaused = subscription.status === 'paused'
  const isScheduledCancel =
    subscription.status === 'active' && Boolean(subscription.cancelled_at)

  if (!canManage) return null

  const closeModal = () => {
    setModal(null)
    setReason('')
    setCancelImmediately(false)
    setRefundAmount('')
    setError('')
  }

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
      closeModal()
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = () =>
    runAction(() =>
      cancelStripeSubscription({
        subscriptionId: subscription.id,
        stripeSubscriptionId: stripeId!,
        reason,
        cancelImmediately,
      })
    )

  const handlePause = () =>
    runAction(() =>
      pauseStripeSubscription({
        subscriptionId: subscription.id,
        stripeSubscriptionId: stripeId!,
        action: isPaused ? 'resume' : 'pause',
        reason,
      })
    )

  const handleRefund = () => {
    const amountCents = refundAmount.trim()
      ? Math.round(parseFloat(refundAmount) * 100)
      : undefined
    if (refundAmount.trim() && (Number.isNaN(amountCents) || amountCents! <= 0)) {
      setError('Enter a valid refund amount.')
      return
    }
    return runAction(async () => {
      await refundStripeSubscription({
        subscriptionId: subscription.id,
        stripeSubscriptionId: stripeId!,
        memberId: subscription.member_id,
        amountCents,
        reason,
      })
    })
  }

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
        {isScheduledCancel && (
          <span className="text-xs text-yellow-400/80 mr-auto">
            Cancels at period end
          </span>
        )}
        {!isScheduledCancel && subscription.status === 'active' && (
          <button
            onClick={() => setModal('cancel')}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
          >
            <XCircle size={14} /> Cancel
          </button>
        )}
        <button
          onClick={() => setModal('pause')}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 transition"
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={() => setModal('refund')}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 transition"
        >
          <RotateCcw size={14} /> Refund
        </button>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">
              {modal === 'cancel' && 'Cancel subscription'}
              {modal === 'pause' && (isPaused ? 'Resume subscription' : 'Pause subscription')}
              {modal === 'refund' && 'Issue refund'}
            </h2>

            {modal === 'cancel' && (
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={cancelImmediately}
                  onChange={(e) => setCancelImmediately(e.target.checked)}
                  className="rounded border-white/20"
                />
                Cancel immediately (not at period end)
              </label>
            )}

            {modal === 'refund' && (
              <div>
                <label className="block text-sm text-white/60 mb-1">
                  Amount (USD, optional — full refund if blank)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="e.g. 49.99"
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-white/60 mb-1">Reason (optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="Notes for your records..."
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                onClick={closeModal}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition disabled:opacity-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (modal === 'cancel') handleCancel()
                  else if (modal === 'pause') handlePause()
                  else handleRefund()
                }}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {busy ? 'Working...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

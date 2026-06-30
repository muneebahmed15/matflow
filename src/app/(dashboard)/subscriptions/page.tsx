'use client'

import { useCallback, useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffInfo } from '@/lib/permissions'
import { CreditCard, CheckCircle, XCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { SubscriptionWithRelations } from '@/types/queries'
import SubscriptionActions from '@/components/SubscriptionActions'

function SubscriptionsContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const cancelled = searchParams.get('cancelled')
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  const loadSubscriptions = useCallback(async () => {
    const info = await getCurrentStaffInfo()
    if (!info.gymId) return
    const { data } = await supabase
      .from('subscriptions')
      .select(`
        id,
        member_id,
        status,
        current_period_end,
        stripe_subscription_id,
        cancellation_reason,
        cancelled_at,
        paused_at,
        pause_reason,
        members(first_name, last_name, email),
        plans(name, price, interval)
      `)
      .eq('gym_id', info.gymId)
      .order('created_at', { ascending: false })
    setSubscriptions((data as SubscriptionWithRelations[] | null) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const load = async () => {
      const info = await getCurrentStaffInfo()
      if (!info.gymId) return
      const { data } = await supabase
        .from('subscriptions')
        .select(`
        id,
        member_id,
        status,
        current_period_end,
        stripe_subscription_id,
        cancellation_reason,
        cancelled_at,
        paused_at,
        pause_reason,
        members(first_name, last_name, email),
        plans(name, price, interval)
      `)
        .eq('gym_id', info.gymId)
        .order('created_at', { ascending: false })
      setSubscriptions((data as SubscriptionWithRelations[] | null) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const statusColor = (s: string) => {
    if (s === 'active') return 'bg-green-500/10 text-green-400 border-green-500/20'
    if (s === 'cancelled' || s === 'canceled') return 'bg-red-500/10 text-red-400 border-red-500/20'
    if (s === 'past_due') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    if (s === 'paused') return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    return 'bg-white/5 text-white/40 border-white/10'
  }

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">Subscriptions</h1>
        <p className="text-white/40 text-sm mt-1">Manage member billing, pauses, and refunds.</p>
      </div>

      {success && (
        <div className="mb-6 flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
          <CheckCircle size={16} className="text-green-400" />
          <p className="text-green-400 text-sm font-medium">Subscription created successfully!</p>
        </div>
      )}
      {cancelled && (
        <div className="mb-6 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
          <XCircle size={16} className="text-yellow-400" />
          <p className="text-yellow-400 text-sm font-medium">Checkout was cancelled.</p>
        </div>
      )}

      {subscriptions.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <CreditCard size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No subscriptions yet</p>
          <p className="text-white/20 text-sm mt-1">Subscribe a member from their profile page.</p>
          <Link href="/members" className="mt-6 inline-block text-blue-400 text-sm hover:underline">Go to Members →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="bg-[#111] border border-white/10 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CreditCard size={18} className="text-white/40" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">
                      {sub.members ? `${sub.members.first_name} ${sub.members.last_name}` : 'Unknown'}
                    </p>
                    <p className="text-xs text-white/30">{sub.members?.email}</p>
                    {sub.current_period_end && (
                      <p className="text-xs text-white/20 mt-1">
                        Period ends {new Date(sub.current_period_end).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-white font-medium">{sub.plans?.name || '—'}</p>
                    <p className="text-xs text-white/30">
                      ${sub.plans?.price?.toFixed(2) ?? '0.00'} / {sub.plans?.interval}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColor(sub.status)}`}>
                    {sub.status}
                  </span>
                </div>
              </div>
              <SubscriptionActions subscription={sub} onUpdated={loadSubscriptions} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading...</div>}>
      <SubscriptionsContent />
    </Suspense>
  )
}

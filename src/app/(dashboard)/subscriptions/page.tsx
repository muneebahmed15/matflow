'use client'

import Link from 'next/link'
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { CreditCard, CheckCircle, XCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

type Subscription = {
  id: string; status: string; current_period_end: string | null
  stripe_subscription_id: string | null
  members: { first_name: string; last_name: string; email: string } | null
  plans: { name: string; price: number; interval: string } | null
}

function SubscriptionsContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const cancelled = searchParams.get('cancelled')
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: gym } = await supabase.from('gyms').select('id').eq('owner_id', user.id).single()
      if (!gym) return
      const { data } = await supabase
        .from('subscriptions')
        .select('id, status, current_period_end, stripe_subscription_id, members(first_name, last_name, email), plans(name, price, interval)')
        .eq('gym_id', gym.id)
        .order('created_at', { ascending: false })
      setSubscriptions((data ?? []) as unknown as Subscription[])
      setLoading(false)
    }
    load()
  }, [])

  const statusColor = (s: string) => {
    if (s === 'active') return 'bg-green-500/10 text-green-400 border-green-500/20'
    if (s === 'cancelled' || s === 'canceled') return 'bg-red-500/10 text-red-400 border-red-500/20'
    if (s === 'past_due') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    return 'bg-white/5 text-white/40 border-white/10'
  }

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">Subscriptions</h1>
        <p className="text-white/40 text-sm mt-1">All member billing subscriptions.</p>
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
            <div key={sub.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CreditCard size={18} className="text-white/40" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">
                    {sub.members ? `${sub.members.first_name} ${sub.members.last_name}` : 'Unknown'}
                  </p>
                  <p className="text-xs text-white/30">{sub.members?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-white font-medium">{sub.plans?.name || '—'}</p>
                  <p className="text-xs text-white/30">${sub.plans?.price?.toFixed(2)} / {sub.plans?.interval}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColor(sub.status)}`}>
                  {sub.status}
                </span>
              </div>
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

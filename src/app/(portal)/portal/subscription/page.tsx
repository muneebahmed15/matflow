'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CreditCard } from 'lucide-react'
import type { PortalSubscription } from '@/types/queries'
import { redirectTo } from '@/lib/navigation'

interface Plan {
  id: string
  name: string
  stripe_price_id: string
  price_cents: number
  interval: string
}

interface PortalMember {
  id: string
  first_name: string
  last_name: string
  email: string | null
  gym_id: string
}

export default function PortalSubscriptionPage() {
  const [subscription, setSubscription] = useState<PortalSubscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [member, setMember] = useState<PortalMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: memberData } = await supabase.from('members').select('id, first_name, last_name, email, gym_id').eq('email', user.email).single()
      if (!memberData) return
      setMember(memberData)
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, status, current_period_end, plans(name, price_cents, interval)')
        .eq('member_id', memberData.id)
        .eq('status', 'active')
        .single()
      setSubscription(sub as PortalSubscription | null)
      if (!sub) {
        const { data: plansData } = await supabase.from('plans').select('id, name, stripe_price_id, price_cents, interval').eq('gym_id', memberData.gym_id).eq('is_active', true)
        setPlans(plansData || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSubscribe = async (stripePriceId: string) => {
    if (!member) return
    setSubscribing(true)
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stripe_price_id: stripePriceId, member_id: member.id, gym_id: member.gym_id, member_email: member.email }),
    })
    const { url } = await res.json()
    if (url) redirectTo(url)
    setSubscribing(false)
  }

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <a href="/portal" className="text-sm text-gray-400 hover:text-white">← Back</a>
        <h1 className="text-2xl font-bold mt-2">My Subscription</h1>
      </div>

      {subscription ? (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
              <CreditCard size={20} className="text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-white">{subscription.plans?.name}</p>
              <p className="text-white/40 text-sm">
                ${subscription.plans?.price_cents ? (subscription.plans.price_cents / 100).toFixed(2) : '0.00'} / {subscription.plans?.interval}
              </p>
            </div>
            <span className="ml-auto px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-medium">
              {subscription.status}
            </span>
          </div>
          {subscription.current_period_end && (
            <p className="text-white/30 text-sm border-t border-white/10 pt-4">
              Next billing date: {new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
            <p className="text-yellow-400 text-sm font-medium">No active subscription</p>
            <p className="text-yellow-400/60 text-xs mt-1">Choose a plan below to get started.</p>
          </div>
          {plans.map(plan => (
            <div key={plan.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{plan.name}</p>
                <p className="text-white/40 text-sm">${(plan.price_cents / 100).toFixed(2)} / {plan.interval}</p>
              </div>
              <button onClick={() => handleSubscribe(plan.stripe_price_id)} disabled={subscribing}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50">
                {subscribing ? 'Loading...' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

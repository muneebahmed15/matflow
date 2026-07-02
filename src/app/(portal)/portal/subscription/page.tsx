'use client'

import { redirectTo } from '@/lib/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CreditCard } from 'lucide-react'
import { usePortalMember } from '@/lib/portal-member-context'
import { canManageBilling } from '@/lib/portal/billing-access'

interface Subscription {
  id: string
  status: string
  stripe_subscription_id: string | null
  current_period_end: string | null
  plans: { name: string; price_cents: number; interval: string } | null
}

interface Plan {
  id: string
  name: string
  stripe_price_id: string
  price_cents: number
  interval: string
}

export default function PortalSubscriptionPage() {
  const { activeMember, loading: memberLoading } = usePortalMember()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [cancelMsg, setCancelMsg] = useState('')
  const [invoices, setInvoices] = useState<
    { id: string; number: string | null; status: string | null; amount_cents: number; created: number; pdf_url: string | null }[]
  >([])

  const billingAllowed = activeMember ? canManageBilling(activeMember.portal_role) : false

  useEffect(() => {
    if (!activeMember) return
    const load = async () => {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, status, stripe_subscription_id, current_period_end, plans(name, price_cents, interval)')
        .eq('member_id', activeMember.id)
        .in('status', ['active', 'past_due', 'trialing', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setSubscription(sub as Subscription | null)
      if (sub) {
        const invRes = await fetch(`/api/portal/invoices?member_id=${activeMember.id}`)
        const invData = await invRes.json()
        if (invData.invoices) setInvoices(invData.invoices)
      }
      if (!sub && billingAllowed) {
        const { data: plansData } = await supabase
          .from('plans')
          .select('id, name, stripe_price_id, price_cents, interval')
          .eq('gym_id', activeMember.gym_id)
          .eq('is_active', true)
        setPlans(plansData || [])
      }
      setLoading(false)
    }
    void load()
  }, [activeMember, billingAllowed])

  const handleSubscribe = async (stripePriceId: string) => {
    if (!activeMember || !billingAllowed) return
    setSubscribing(true)
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stripe_price_id: stripePriceId,
        member_id: activeMember.id,
        gym_id: activeMember.gym_id,
        member_email: activeMember.email,
      }),
    })
    const { url } = await res.json()
    if (url) redirectTo(url)
    setSubscribing(false)
  }

  const handleCancel = async () => {
    if (!subscription?.stripe_subscription_id || !activeMember || !billingAllowed) return
    if (!confirm('Cancel your membership at the end of the current billing period?')) return
    setCancelling(true)
    setCancelMsg('')
    const res = await fetch('/api/portal/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription_id: subscription.id,
        stripe_subscription_id: subscription.stripe_subscription_id,
        reason: 'Member self-serve cancel',
        member_id: activeMember.id,
      }),
    })
    setCancelling(false)
    if (res.ok) {
      setCancelMsg('Cancellation scheduled. Your membership stays active until the end of the billing period.')
    }
  }

  const handlePause = async (action: 'pause' | 'resume') => {
    if (!subscription?.stripe_subscription_id || !activeMember || !billingAllowed) return
    const reason = action === 'pause' ? 'Member requested pause' : undefined
    if (action === 'pause' && !confirm('Pause billing until you resume?')) return
    setPausing(true)
    setCancelMsg('')
    const res = await fetch('/api/portal/pause-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription_id: subscription.id,
        stripe_subscription_id: subscription.stripe_subscription_id,
        reason,
        action,
        member_id: activeMember.id,
      }),
    })
    setPausing(false)
    if (res.ok) {
      setCancelMsg(action === 'pause' ? 'Membership paused.' : 'Membership resumed.')
      setSubscription({ ...subscription, status: action === 'pause' ? 'paused' : 'active' })
    }
  }

  if (memberLoading || loading || !activeMember) {
    return <div className="text-gray-400 py-12 text-center">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <a href="/portal" className="text-sm text-gray-400 hover:text-white">← Back</a>
        <h1 className="text-2xl font-bold mt-2">My Subscription</h1>
        <p className="text-white/40 text-sm mt-1">
          {activeMember.first_name} {activeMember.last_name}
        </p>
      </div>

      {!billingAllowed && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white/50">
          Billing is managed by the primary account holder. You can view membership status here.
        </div>
      )}

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
          {billingAllowed && (
            <>
              <button
                onClick={async () => {
                  const res = await fetch('/api/stripe/billing-portal', { method: 'POST' })
                  const data = await res.json()
                  if (data.url) redirectTo(data.url)
                }}
                className="mt-4 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold py-2.5 rounded-xl transition"
              >
                Manage Billing
              </button>
              {subscription.stripe_subscription_id && subscription.status !== 'paused' && (
                <button
                  onClick={() => void handlePause('pause')}
                  disabled={pausing}
                  className="mt-2 w-full text-yellow-400 hover:text-yellow-300 text-sm py-2"
                >
                  {pausing ? 'Updating...' : 'Pause membership'}
                </button>
              )}
              {subscription.status === 'paused' && subscription.stripe_subscription_id && (
                <button
                  onClick={() => void handlePause('resume')}
                  disabled={pausing}
                  className="mt-2 w-full text-green-400 hover:text-green-300 text-sm py-2"
                >
                  {pausing ? 'Updating...' : 'Resume membership'}
                </button>
              )}
              {subscription.stripe_subscription_id && subscription.status !== 'paused' && (
                <button
                  onClick={() => void handleCancel()}
                  disabled={cancelling}
                  className="mt-2 w-full text-red-400 hover:text-red-300 text-sm py-2"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel at period end'}
                </button>
              )}
            </>
          )}
          {cancelMsg && <p className="text-green-400 text-xs mt-2">{cancelMsg}</p>}
        </div>
      ) : billingAllowed ? (
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
      ) : (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 text-center text-white/40 text-sm">
          No active subscription on this profile.
        </div>
      )}

      {invoices.length > 0 && (
        <div>
          <h2 className="font-semibold text-white mb-3">Invoice History</h2>
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="bg-[#111] border border-white/10 rounded-xl px-4 py-3 flex justify-between items-center text-sm">
                <div>
                  <p className="text-white">{inv.number ?? 'Invoice'}</p>
                  <p className="text-white/30 text-xs">
                    {new Date(inv.created * 1000).toLocaleDateString()} · ${(inv.amount_cents / 100).toFixed(2)}
                  </p>
                </div>
                {inv.pdf_url && (
                  <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline">
                    PDF
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

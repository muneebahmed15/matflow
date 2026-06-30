'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CreditCard, Plus } from 'lucide-react'

interface Plan {
  id: string; name: string; description: string
  price: number; interval: string; is_active: boolean; created_at: string
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [gymId, setGymId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [interval, setInterval] = useState('month')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: gym } = await supabase.from('gyms').select('id').eq('owner_id', user.id).single()
      if (!gym) return
      setGymId(gym.id)
      const { data } = await supabase.from('plans').select('*').eq('gym_id', gym.id).order('created_at', { ascending: false })
      setPlans(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleSubmit = async () => {
    if (!name || !price) { setError('Name and price are required.'); return }
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/stripe/create-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, price_cents: Math.round(parseFloat(price) * 100), interval, gym_id: gymId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to create plan'); setSubmitting(false); return }
    // Reload plans
    const { data: updated } = await supabase.from('plans').select('*').eq('gym_id', gymId).order('created_at', { ascending: false })
    setPlans(updated || [])
    setName(''); setDescription(''); setPrice(''); setInterval('month')
    setShowForm(false)
    setSubmitting(false)
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Plans</h1>
          <p className="text-white/40 text-sm mt-1">Membership billing plans connected to Stripe.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          <Plus size={16} /> New Plan
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-white">Create New Plan</h2>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Plan Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monthly Unlimited" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Unlimited classes, no contract" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Price (USD)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="99.00" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Billing Interval</label>
              <select value={interval} onChange={(e) => setInterval(e.target.value)} className={inputClass}>
                <option value="month" className="bg-gray-900">Monthly</option>
                <option value="year" className="bg-gray-900">Yearly</option>
              </select>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition">
              {submitting ? 'Creating...' : 'Create Plan'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <CreditCard size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No plans yet</p>
          <p className="text-white/20 text-sm mt-1">Create your first membership plan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <CreditCard size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">{plan.name}</p>
                  <p className="text-xs text-white/30">{plan.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold">${Number(plan.price).toFixed(2)}<span className="text-white/30 font-normal text-xs"> / {plan.interval}</span></p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${plan.is_active ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'}`}>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

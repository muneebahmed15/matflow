'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import BlogRichTextEditor from '@/components/marketing/BlogRichTextEditor'

type Props = {
  gymId: string
}

export default function NewPlanForm({ gymId }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [interval, setInterval] = useState('month')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name || !price) { setError('Name and price are required.'); return }
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/stripe/create-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        price_cents: Math.round(parseFloat(price) * 100),
        interval,
        gym_id: gymId,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to create plan'); setSubmitting(false); return }
    setName(''); setDescription(''); setPrice(''); setInterval('month')
    setShowForm(false)
    setSubmitting(false)
    router.refresh()
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <>
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
            <BlogRichTextEditor
              value={description}
              onChange={setDescription}
              rows={6}
              placeholder="e.g. Unlimited classes, no contract"
            />
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
    </>
  )
}

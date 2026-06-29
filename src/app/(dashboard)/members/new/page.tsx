'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AddMemberPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [first_name, setFirstName] = useState('')
  const [last_name, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [belt_rank, setBeltRank] = useState('white')
  const [status, setStatus] = useState('active')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!first_name || !last_name) { setError('First and last name are required.'); return }
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: gymData } = await supabase.from('gyms').select('id').eq('owner_id', user.id).single()
    if (!gymData) { setLoading(false); return }
    const { error: err } = await supabase.from('members').insert({ first_name, last_name, email, phone, belt_rank, status, gym_id: gymData.id })
    setLoading(false)
    if (err) { setError(err.message) } else { router.push('/members') }
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500"
  const labelClass = "block text-sm font-medium text-gray-300 mb-1"

  return (
    <div className="p-6 md:p-8 max-w-xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1">← Back</button>
      <h1 className="text-2xl font-bold mb-6">Add Member</h1>
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>First Name</label>
            <input value={first_name} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Last Name</label>
            <input value={last_name} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Belt Rank</label>
            <select value={belt_rank} onChange={(e) => setBeltRank(e.target.value)} className={inputClass}>
              {['white','yellow','orange','green','blue','purple','brown','black'].map(b => (
                <option key={b} value={b} className="bg-gray-900 capitalize">{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              <option value="active" className="bg-gray-900">Active</option>
              <option value="inactive" className="bg-gray-900">Inactive</option>
            </select>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button onClick={handleSubmit} disabled={loading || !first_name || !last_name} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition">
          {loading ? 'Adding...' : 'Add Member'}
        </button>
      </div>
    </div>
  )
}

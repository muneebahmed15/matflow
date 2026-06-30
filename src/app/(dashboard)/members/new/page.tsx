'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffInfo } from '@/lib/permissions'
import { useRouter } from 'next/navigation'

interface Family {
  id: string
  family_name: string
}

export default function AddMemberPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [gymId, setGymId] = useState<string | null>(null)
  const [first_name, setFirstName] = useState('')
  const [last_name, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [belt_rank, setBeltRank] = useState('white')
  const [status, setStatus] = useState('active')
  const [error, setError] = useState('')

  // Family billing
  const [families, setFamilies] = useState<Family[]>([])
  const [familyOption, setFamilyOption] = useState<'none' | 'existing' | 'new'>('none')
  const [selectedFamilyId, setSelectedFamilyId] = useState('')
  const [newFamilyName, setNewFamilyName] = useState('')
  const [newFamilyEmail, setNewFamilyEmail] = useState('')

  useEffect(() => {
    const load = async () => {
      const info = await getCurrentStaffInfo()
      if (!info.gymId) return
      setGymId(info.gymId)
      const { data } = await supabase.from('families').select('id, family_name').eq('gym_id', info.gymId).order('family_name')
      setFamilies(data || [])
    }
    load()
  }, [])

  const handleSubmit = async () => {
    if (!first_name || !last_name) { setError('First and last name are required.'); return }
    if (familyOption === 'new' && !newFamilyName) { setError('Family name is required.'); return }
    if (familyOption === 'existing' && !selectedFamilyId) { setError('Please select a family.'); return }

    setLoading(true)
    setError('')

    let familyId: string | null = null

    if (familyOption === 'new') {
      const { data: newFamily, error: famErr } = await supabase.from('families').insert({
        gym_id: gymId,
        family_name: newFamilyName,
        primary_email: newFamilyEmail || email,
      }).select().single()
      if (famErr) { setError(famErr.message); setLoading(false); return }
      familyId = newFamily.id
    } else if (familyOption === 'existing') {
      familyId = selectedFamilyId
    }

    const { error: err } = await supabase.from('members').insert({
      first_name, last_name, email, phone, belt_rank, status, gym_id: gymId, family_id: familyId
    })
    setLoading(false)
    if (err) { setError(err.message) } else { router.push('/members') }
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* Family Billing Section */}
        <div className="pt-4 border-t border-white/10">
          <label className={labelClass}>Family Billing</label>
          <p className="text-white/20 text-xs mb-3">Link this member to a family for shared billing (e.g. parent + kids).</p>
          <div className="flex gap-2 mb-3">
            {([
              { val: 'none', label: 'No family' },
              { val: 'existing', label: 'Existing family' },
              { val: 'new', label: 'New family' },
            ] as const).map(opt => (
              <button key={opt.val} onClick={() => setFamilyOption(opt.val)}
                className={`flex-1 text-xs font-medium py-2 rounded-lg border transition ${familyOption === opt.val ? 'bg-blue-600/15 border-blue-600/30 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>
                {opt.label}
              </button>
            ))}
          </div>

          {familyOption === 'existing' && families.length > 0 && (
            <select value={selectedFamilyId} onChange={(e) => setSelectedFamilyId(e.target.value)} className={inputClass}>
              <option value="" className="bg-gray-900">Select a family...</option>
              {families.map(f => (
                <option key={f.id} value={f.id} className="bg-gray-900">{f.family_name}</option>
              ))}
            </select>
          )}
          {familyOption === 'existing' && families.length === 0 && (
            <p className="text-white/30 text-xs">No families yet. Create a new one instead.</p>
          )}

          {familyOption === 'new' && (
            <div className="space-y-3">
              <input value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)} placeholder="Family name (e.g. The Smith Family)" className={inputClass} />
              <input value={newFamilyEmail} onChange={(e) => setNewFamilyEmail(e.target.value)} placeholder="Billing email (optional, defaults to member email)" className={inputClass} />
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button onClick={handleSubmit} disabled={loading || !first_name || !last_name} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition">
          {loading ? 'Adding...' : 'Add Member'}
        </button>
      </div>
    </div>
  )
}

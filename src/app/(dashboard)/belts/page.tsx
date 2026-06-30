'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffInfo } from '@/lib/permissions'
import { Award, Plus } from 'lucide-react'

interface Member {
  id: string
  first_name: string
  last_name: string
  belt_rank: string
  email: string
}

interface BeltPromotion {
  id: string
  member_id: string
  from_belt: string
  to_belt: string
  promoted_at: string
  notes: string
  members: { first_name: string; last_name: string }
}

const BELTS = ['white','yellow','orange','green','blue','purple','brown','black']

const beltColors: Record<string, string> = {
  white: 'bg-white/10 text-white',
  yellow: 'bg-yellow-500/20 text-yellow-400',
  orange: 'bg-orange-500/20 text-orange-400',
  green: 'bg-green-500/20 text-green-400',
  blue: 'bg-blue-500/20 text-blue-400',
  purple: 'bg-purple-500/20 text-purple-400',
  brown: 'bg-amber-700/20 text-amber-500',
  black: 'bg-white/5 text-white/60',
}

export default function BeltsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [promotions, setPromotions] = useState<BeltPromotion[]>([])
  const [gymId, setGymId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedMember, setSelectedMember] = useState('')
  const [toBelt, setToBelt] = useState('blue')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      const info = await getCurrentStaffInfo()
      if (!info.gymId) return
      setGymId(info.gymId)
      const [{ data: membersData }, { data: promoData }] = await Promise.all([
        supabase.from('members').select('id, first_name, last_name, belt_rank, email').eq('gym_id', info.gymId).order('first_name'),
        supabase.from('belt_promotions').select('*, members(first_name, last_name)').eq('gym_id', info.gymId).order('promoted_at', { ascending: false }).limit(20),
      ])
      setMembers(membersData || [])
      setPromotions(promoData || [])
      setLoading(false)
    }
    load()
  }, [])

  const handlePromote = async () => {
    if (!selectedMember || !gymId) return
    setSubmitting(true)
    const member = members.find(m => m.id === selectedMember)
    if (!member) return
    const fromBelt = member.belt_rank
    // Insert promotion record
    await supabase.from('belt_promotions').insert({
      gym_id: gymId,
      member_id: selectedMember,
      from_belt: fromBelt,
      to_belt: toBelt,
      notes,
      promoted_at: new Date().toISOString(),
    })
    // Update member belt
    await supabase.from('members').update({ belt_rank: toBelt }).eq('id', selectedMember)
    // Refresh
    const [{ data: membersData }, { data: promoData }] = await Promise.all([
      supabase.from('members').select('id, first_name, last_name, belt_rank, email').eq('gym_id', gymId).order('first_name'),
      supabase.from('belt_promotions').select('*, members(first_name, last_name)').eq('gym_id', gymId).order('promoted_at', { ascending: false }).limit(20),
    ])
    setMembers(membersData || [])
    setPromotions(promoData || [])
    setSelectedMember('')
    setNotes('')
    setShowForm(false)
    setSubmitting(false)
  }

  const selectedMemberData = members.find(m => m.id === selectedMember)
  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Belt Promotions</h1>
          <p className="text-white/40 text-sm mt-1">Track and log member belt promotions.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          <Plus size={16} /> Promote Member
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-white">Log Belt Promotion</h2>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Member</label>
            <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className={inputClass}>
              <option value="" className="bg-gray-900">Select a member...</option>
              {members.map(m => (
                <option key={m.id} value={m.id} className="bg-gray-900">
                  {m.first_name} {m.last_name} ({m.belt_rank})
                </option>
              ))}
            </select>
          </div>
          {selectedMemberData && (
            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
              <div>
                <p className="text-white/40 text-xs mb-1">Current Belt</p>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${beltColors[selectedMemberData.belt_rank]}`}>
                  {selectedMemberData.belt_rank}
                </span>
              </div>
              <div className="text-white/20 text-lg">→</div>
              <div>
                <p className="text-white/40 text-xs mb-1">Promoting To</p>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${beltColors[toBelt]}`}>
                  {toBelt}
                </span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Promote To</label>
            <select value={toBelt} onChange={(e) => setToBelt(e.target.value)} className={inputClass}>
              {BELTS.map(b => (
                <option key={b} value={b} className="bg-gray-900 capitalize">{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Outstanding performance at tournament" className={inputClass} />
          </div>
          <div className="flex gap-3">
            <button onClick={handlePromote} disabled={submitting || !selectedMember} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition">
              {submitting ? 'Saving...' : 'Log Promotion'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Current Belt Rankings */}
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="font-semibold text-white mb-4">Current Belt Rankings</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BELTS.map(belt => {
            const count = members.filter(m => m.belt_rank === belt).length
            return (
              <div key={belt} className={`rounded-xl p-3 border border-white/10 ${count > 0 ? '' : 'opacity-30'}`}>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${beltColors[belt]}`}>{belt}</span>
                <p className="text-2xl font-bold text-white mt-2">{count}</p>
                <p className="text-white/30 text-xs">members</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Promotion History */}
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">Recent Promotions</h2>
        {promotions.length === 0 ? (
          <div className="text-center py-12">
            <Award size={40} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/30 text-sm">No promotions logged yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {promotions.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Award size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{p.members.first_name} {p.members.last_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs capitalize ${beltColors[p.from_belt]}`}>{p.from_belt}</span>
                      <span className="text-white/20 text-xs">→</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs capitalize ${beltColors[p.to_belt]}`}>{p.to_belt}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/30 text-xs">{new Date(p.promoted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  {p.notes && <p className="text-white/20 text-xs mt-0.5 max-w-32 truncate">{p.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

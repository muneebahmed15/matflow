'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Trophy, Plus } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

interface Member {
  id: string
  first_name: string
  last_name: string
}

interface Competition {
  id: string
  name: string
  event_date: string | null
  division: string | null
  result: string | null
  notes: string | null
  members: { first_name: string; last_name: string } | null
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [gymId, setGymId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [memberId, setMemberId] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [division, setDivision] = useState('')
  const [result, setResult] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: gym } = await supabase.from('gyms').select('id').eq('owner_id', user.id).single()
      if (!gym) return
      setGymId(gym.id)

      const [{ data: memberData }, { data: compData }] = await Promise.all([
        supabase.from('members').select('id, first_name, last_name').eq('gym_id', gym.id).order('first_name'),
        supabase
          .from('competitions')
          .select('id, name, event_date, division, result, notes, members(first_name, last_name)')
          .eq('gym_id', gym.id)
          .order('event_date', { ascending: false }),
      ])

      setMembers(memberData || [])
      setCompetitions((compData ?? []) as unknown as Competition[])
      setLoading(false)
    }
    load()
  }, [])

  const handleSubmit = async () => {
    if (!gymId || !name.trim()) {
      setError('Tournament name is required.')
      return
    }
    setSubmitting(true)
    setError('')
    const { error: insertError } = await supabase.from('competitions').insert({
      gym_id: gymId,
      member_id: memberId || null,
      name: name.trim(),
      event_date: eventDate || null,
      division: division || null,
      result: result || null,
      notes: notes || null,
    })
    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }
    const { data } = await supabase
      .from('competitions')
      .select('id, name, event_date, division, result, notes, members(first_name, last_name)')
      .eq('gym_id', gymId)
      .order('event_date', { ascending: false })
    setCompetitions((data ?? []) as unknown as Competition[])
    setName('')
    setMemberId('')
    setEventDate('')
    setDivision('')
    setResult('')
    setNotes('')
    setShowForm(false)
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this competition record?')) return
    await supabase.from('competitions').delete().eq('id', id)
    setCompetitions((prev) => prev.filter((c) => c.id !== id))
  }

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500'

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Competitions</h1>
          <p className="text-white/40 text-sm mt-1">Log tournaments, divisions, and results.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} /> Log Competition
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-white">New competition entry</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tournament name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="IBJJF Houston Open" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Athlete</label>
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={inputClass}>
                <option value="" className="bg-gray-900">Select member (optional)</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id} className="bg-gray-900">
                    {m.first_name} {m.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Division</label>
              <input value={division} onChange={(e) => setDivision(e.target.value)} placeholder="Adult Blue / 76kg" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Result</label>
              <input value={result} onChange={(e) => setResult(e.target.value)} placeholder="Gold / 2-1 / DNF" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className={inputClass} />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition"
            >
              {submitting ? 'Saving...' : 'Save entry'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {competitions.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No competitions logged yet"
          description="Track tournament results for your athletes. Use Log Competition above to add your first entry."
        />
      ) : (
        <div className="space-y-3">
          {competitions.map((comp) => (
            <div key={comp.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Trophy size={18} className="text-yellow-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">{comp.name}</p>
                  <p className="text-xs text-white/40 mt-1">
                    {comp.members ? `${comp.members.first_name} ${comp.members.last_name} · ` : ''}
                    {comp.event_date ? new Date(comp.event_date).toLocaleDateString('en-US') : 'No date'}
                    {comp.division ? ` · ${comp.division}` : ''}
                  </p>
                  {comp.result && <p className="text-sm text-green-400 mt-1">Result: {comp.result}</p>}
                  {comp.notes && <p className="text-sm text-white/40 mt-1">{comp.notes}</p>}
                </div>
              </div>
              <button onClick={() => handleDelete(comp.id)} className="text-white/20 hover:text-red-400 text-xs transition flex-shrink-0">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

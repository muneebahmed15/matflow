'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { UserCheck, Search } from 'lucide-react'

interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
}

export default function KioskCheckInPage() {
  const { gymSlug } = useParams<{ gymSlug: string }>()
  const [gym, setGym] = useState<{ id: string; name: string; kiosk_enabled: boolean } | null>(null)
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [filtered, setFiltered] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [checkedInName, setCheckedInName] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: gymData } = await supabase.from('gyms').select('id, name, kiosk_enabled').eq('slug', gymSlug).single()
      if (!gymData) { setLoading(false); return }
      setGym(gymData)
      if (gymData.kiosk_enabled) {
        const { data } = await supabase.from('members').select('id, first_name, last_name, email').eq('gym_id', gymData.id).eq('status', 'active').order('first_name')
        setMembers(data || [])
        setFiltered(data || [])
      }
      setLoading(false)
    }
    load()
  }, [gymSlug])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(members.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(q)))
  }, [search, members])

  const handleCheckIn = async (member: Member) => {
    if (!gym) return
    setError('')
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: member.id, gym_id: gym.id }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Check-in failed.')
      return
    }
    setCheckedInName(`${member.first_name} ${member.last_name}`)
    setSearch('')
    setTimeout(() => setCheckedInName(null), 3500)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <p className="text-white/40">Loading...</p>
    </div>
  )

  if (!gym) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <p className="text-white/40 text-center">Gym not found.</p>
    </div>
  )

  if (!gym.kiosk_enabled) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <p className="text-white/40 text-center">Kiosk check-in is not enabled for this gym.<br />Contact your gym admin.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center px-6 py-10">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-black">M</span>
        </div>
        <span className="font-bold text-xl">{gym.name}</span>
      </div>
      <p className="text-white/30 text-sm mb-8">Tap your name to check in</p>

      {checkedInName && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck size={36} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold">{checkedInName}</p>
            <p className="text-green-400 mt-1">Checked in!</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="relative mb-4">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            autoFocus
            placeholder="Type your name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white text-lg placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

        <div className="space-y-2">
          {filtered.slice(0, 8).map((m) => (
            <button
              key={m.id}
              onClick={() => handleCheckIn(m)}
              className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-5 py-4 transition text-left"
            >
              <span className="text-lg font-medium">{m.first_name} {m.last_name}</span>
              <UserCheck size={20} className="text-white/30" />
            </button>
          ))}
          {search && filtered.length === 0 && (
            <p className="text-white/20 text-center py-8">No member found. Ask staff for help.</p>
          )}
        </div>
      </div>
    </div>
  )
}

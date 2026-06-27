'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Member = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
}

export default function CheckInPage() {
  const [gymId, setGymId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [filtered, setFiltered] = useState<Member[]>([])
  const [checkedIn, setCheckedIn] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: gym } = await supabase
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!gym) return
      setGymId(gym.id)

      const { data: memberData } = await supabase
        .from('members')
        .select('id, first_name, last_name, email, phone')
        .eq('gym_id', gym.id)
        .order('first_name')

      setMembers(memberData || [])
      setFiltered(memberData || [])

      const today = new Date().toISOString().split('T')[0]
      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('member_id')
        .eq('gym_id', gym.id)
        .gte('checked_in_at', `${today}T00:00:00`)
        .lte('checked_in_at', `${today}T23:59:59`)

      const ids = new Set<string>((todayAttendance || []).map((a) => a.member_id))
      setCheckedIn(ids)
    }

    load()
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      members.filter(
        (m) =>
          m.first_name.toLowerCase().includes(q) ||
          m.last_name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      )
    )
  }, [search, members])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCheckIn = async (member: Member) => {
    if (!gymId) return
    setLoading(member.id)

    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('gym_id', gymId)
      .eq('member_id', member.id)
      .gte('checked_in_at', `${today}T00:00:00`)
      .lte('checked_in_at', `${today}T23:59:59`)
      .maybeSingle()

    if (existing) {
      showToast(`⚠️ ${member.first_name} already checked in today`, 'error')
      setCheckedIn((prev) => new Set([...prev, member.id]))
      setLoading(null)
      return
    }

    const { error } = await supabase
      .from('attendance')
      .insert({ member_id: member.id, gym_id: gymId, checked_in_by: (await supabase.auth.getUser()).data.user?.id })

    setLoading(null)

    if (error) {
      showToast(`⚠️ ${error.message}`, 'error')
    } else {
      setCheckedIn((prev) => new Set([...prev, member.id]))
      showToast(`✅ ${member.first_name} ${member.last_name} checked in!`, 'success')
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1">Check-In</h1>
      <p className="text-white/50 text-sm mb-6">Search for a member and tap to check them in.</p>

      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${
          toast.type === 'success'
            ? 'bg-green-500/10 text-green-400 border-green-500/30'
            : 'bg-red-500/10 text-red-400 border-red-500/30'
        }`}>
          {toast.message}
        </div>
      )}

      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
      />

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-white/30 text-sm text-center py-12">No members found.</p>
        )}
        {filtered.map((member) => {
          const done = checkedIn.has(member.id)
          const busy = loading === member.id
          return (
            <div
              key={member.id}
              className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-white font-semibold">{member.first_name} {member.last_name}</p>
                <p className="text-white/40 text-xs">{member.email}</p>
              </div>
              <button
                onClick={() => handleCheckIn(member)}
                disabled={done || busy}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  done
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30 cursor-default'
                    : busy
                    ? 'bg-white/5 text-white/30 cursor-wait'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {done ? 'Checked In ✓' : busy ? 'Checking...' : 'Check In'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
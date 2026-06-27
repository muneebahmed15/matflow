'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserCheck, Clock, Users, Calendar } from 'lucide-react'

type Member = {
  id: string
  first_name: string
  last_name: string
  belt_rank: string
  status: string
}

type Class = {
  id: string
  name: string
  instructor: string
  start_time: string
  day_of_week: string
}

type AttendanceRecord = {
  id: string
  checked_in_at: string
  member: {
    first_name: string
    last_name: string
    belt_rank: string
  }
  class: {
    name: string
  } | null
}

const beltColors: Record<string, string> = {
  white: 'bg-white text-black',
  blue: 'bg-blue-600 text-white',
  purple: 'bg-purple-600 text-white',
  brown: 'bg-amber-800 text-white',
  black: 'bg-gray-900 text-white border border-white/20',
}

export default function AttendancePage() {
  const [members, setMembers] = useState<Member[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [gymId, setGymId] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const { data: gymData } = await supabase
        .from('gyms').select('id').eq('slug', 'east-coast-mma').single()
      if (gymData) {
        setGymId(gymData.id)
        await Promise.all([
          fetchMembers(),
          fetchClasses(),
          fetchTodayAttendance(),
        ])
      }
      setLoading(false)
    }
    init()
  }, [])

  async function fetchMembers() {
    const { data } = await supabase
      .from('members')
      .select('id, first_name, last_name, belt_rank, status')
      .eq('status', 'active')
      .order('first_name')
    setMembers(data || [])
  }

  async function fetchClasses() {
    const { data } = await supabase
      .from('classes')
      .select('id, name, instructor, start_time, day_of_week')
      .eq('is_active', true)
      .order('start_time')
    setClasses(data || [])
  }

  async function fetchTodayAttendance() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('attendance')
      .select(`
        id,
        checked_in_at,
        member:members(first_name, last_name, belt_rank),
        class:classes(name)
      `)
      .eq('date', today)
      .order('checked_in_at', { ascending: false })
    setTodayAttendance((data as any) || [])
  }

  async function handleCheckIn(memberId: string) {
    setCheckingIn(memberId)
    const today = new Date().toISOString().split('T')[0]

    // Check if already checked in today for this class
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('member_id', memberId)
      .eq('date', today)
      .eq('class_id', selectedClass || null)
      .single()

    if (existing) {
      alert('Member already checked in today for this class')
      setCheckingIn(null)
      return
    }

    const { error } = await supabase.from('attendance').insert({
      member_id: memberId,
      gym_id: gymId,
      class_id: selectedClass || null,
      date: today,
    })

    if (!error) {
      await fetchTodayAttendance()
    }
    setCheckingIn(null)
  }

  const filteredMembers = members.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const checkedInIds = new Set(todayAttendance.map(a => (a as any).member_id))

  if (loading) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-white/50">Loading attendance...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="text-white/50 hover:text-white transition text-sm">← Dashboard</a>
          <span className="text-white/20">/</span>
          <span className="font-bold">Attendance</span>
        </div>
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Calendar size={14} />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <UserCheck size={16} className="text-green-400" />
              </div>
              <span className="text-white/50 text-sm">Checked In Today</span>
            </div>
            <p className="text-3xl font-extrabold">{todayAttendance.length}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users size={16} className="text-blue-400" />
              </div>
              <span className="text-white/50 text-sm">Active Members</span>
            </div>
            <p className="text-3xl font-extrabold">{members.length}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Clock size={16} className="text-purple-400" />
              </div>
              <span className="text-white/50 text-sm">Classes Today</span>
            </div>
            <p className="text-3xl font-extrabold">{classes.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Check In Panel */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Check In Member</h2>

            {/* Class Selector */}
            <div className="mb-4">
              <label className="text-white/40 text-xs mb-2 block">Select Class (optional)</label>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 text-sm"
              >
                <option value="">No specific class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.start_time.slice(0, 5)}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search member..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-red-500 text-sm"
              />
            </div>

            {/* Members List */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredMembers.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-8">No members found</p>
              ) : (
                filteredMembers.map(member => {
                  const isCheckedIn = checkedInIds.has(member.id)
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition ${
                        isCheckedIn
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-white/3 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                          {member.first_name[0]}{member.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.first_name} {member.last_name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${beltColors[member.belt_rank] || 'bg-white/10'}`}>
                            {member.belt_rank}
                          </span>
                        </div>
                      </div>
                      {isCheckedIn ? (
                        <span className="text-green-400 text-xs font-semibold flex items-center gap-1">
                          <UserCheck size={14} /> In
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCheckIn(member.id)}
                          disabled={checkingIn === member.id}
                          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                          {checkingIn === member.id ? '...' : 'Check In'}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Today's Log */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Today's Log</h2>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {todayAttendance.length === 0 ? (
                <div className="text-center py-16 text-white/30">
                  <UserCheck size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No check-ins yet today</p>
                </div>
              ) : (
                todayAttendance.map(record => (
                  <div key={record.id} className="flex items-center justify-between px-4 py-3 bg-white/3 border border-white/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <UserCheck size={14} className="text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {record.member?.first_name} {record.member?.last_name}
                        </p>
                        <p className="text-white/40 text-xs">
                          {record.class?.name || 'Open mat'} · {new Date(record.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${beltColors[record.member?.belt_rank] || 'bg-white/10'}`}>
                      {record.member?.belt_rank}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
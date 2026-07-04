'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { UserCheck, Search, FileText } from 'lucide-react'

interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface TodayClass {
  id: string
  name: string
  start_time: string | null
  end_time: string | null
  category_tag: string | null
  color: string | null
}

interface KioskWaiver {
  id: string
  title: string
  body: string
}

export default function KioskCheckInPage() {
  const { gymSlug } = useParams<{ gymSlug: string }>()
  const [gym, setGym] = useState<{ id: string; name: string; kiosk_enabled: boolean } | null>(null)
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkedInName, setCheckedInName] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Waiver sign flow state
  const [waiverMember, setWaiverMember] = useState<Member | null>(null)
  const [waivers, setWaivers] = useState<KioskWaiver[]>([])
  const [signedName, setSignedName] = useState('')
  const [signing, setSigning] = useState(false)
  const [waiverError, setWaiverError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: gymData } = await supabase.from('gyms').select('id, name, kiosk_enabled').eq('slug', gymSlug).single()
      if (!gymData) { setLoading(false); return }
      setGym(gymData)
      if (gymData.kiosk_enabled) {
        const [{ data }, classesRes] = await Promise.all([
          supabase.from('members').select('id, first_name, last_name, email').eq('gym_id', gymData.id).eq('status', 'active').order('first_name'),
          fetch(`/api/public/todays-classes?gym_id=${gymData.id}`),
        ])
        setMembers(data || [])
        if (classesRes.ok) {
          const body = (await classesRes.json()) as { data?: TodayClass[] }
          setTodayClasses(body.data ?? [])
        }
      }
      setLoading(false)
    }
    load()
  }, [gymSlug])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return members.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(q))
  }, [search, members])

  const attemptCheckIn = async (member: Member): Promise<{ ok: boolean; error?: string; status?: number }> => {
    if (!gym) return { ok: false }
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: member.id,
        gym_id: gym.id,
        ...(selectedClassId ? { class_id: selectedClassId } : {}),
      }),
    })
    const data = (await res.json()) as { error?: string }
    if (!res.ok) return { ok: false, error: data.error, status: res.status }
    return { ok: true }
  }

  const showSuccess = (member: Member) => {
    setCheckedInName(`${member.first_name} ${member.last_name}`)
    setSearch('')
    setTimeout(() => setCheckedInName(null), 3500)
  }

  const startWaiverFlow = async (member: Member) => {
    if (!gym) return
    const res = await fetch(`/api/public/waivers?gym_id=${gym.id}`)
    const data = (await res.json()) as { data?: KioskWaiver[] }
    if (!res.ok || !data.data?.length) {
      setError('A waiver is required but could not be loaded. Ask staff for help.')
      return
    }
    setWaivers(data.data)
    setSignedName('')
    setWaiverError('')
    setWaiverMember(member)
  }

  const handleCheckIn = async (member: Member) => {
    setError('')
    const result = await attemptCheckIn(member)
    if (result.ok) {
      showSuccess(member)
      return
    }
    if (result.status === 403 && result.error?.toLowerCase().startsWith('waiver signature required')) {
      await startWaiverFlow(member)
      return
    }
    setError(result.error || 'Check-in failed.')
  }

  const handleSignWaivers = async () => {
    if (!gym || !waiverMember) return
    setSigning(true)
    setWaiverError('')

    for (const waiver of waivers) {
      const res = await fetch('/api/public/waivers/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gym_id: gym.id,
          waiver_id: waiver.id,
          member_id: waiverMember.id,
          signed_name: signedName,
        }),
      })
      // 409 = already signed and still valid; safe to skip
      if (!res.ok && res.status !== 409) {
        const data = (await res.json()) as { error?: string }
        setWaiverError(data.error || 'Signing failed. Ask staff for help.')
        setSigning(false)
        return
      }
    }

    const result = await attemptCheckIn(waiverMember)
    setSigning(false)
    const member = waiverMember
    setWaiverMember(null)

    if (result.ok) {
      showSuccess(member)
    } else {
      setError(result.error || 'Check-in failed after signing. Ask staff for help.')
    }
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

      {waiverMember && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 px-4 py-8">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg max-h-full flex flex-col">
            <div className="p-5 border-b border-white/10">
              <p className="font-bold text-lg flex items-center gap-2">
                <FileText size={18} className="text-purple-400" />
                Waiver required
              </p>
              <p className="text-white/40 text-sm mt-1">
                {waiverMember.first_name} {waiverMember.last_name} must sign before checking in.
              </p>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
              {waivers.map((w) => (
                <div key={w.id}>
                  <p className="font-semibold text-sm mb-1">{w.title}</p>
                  <p className="text-white/50 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto border border-white/10 rounded-lg p-3">
                    {w.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-white/10 space-y-3">
              <input
                type="text"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                placeholder={`Type your full name (${waiverMember.first_name} ${waiverMember.last_name})`}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {waiverError && <p className="text-red-400 text-sm">{waiverError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => setWaiverMember(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSignWaivers()}
                  disabled={signing || signedName.trim().length < 2}
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-semibold"
                >
                  {signing ? 'Signing...' : 'I agree — sign & check in'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        {todayClasses.length > 0 && (
          <div className="mb-4">
            <p className="text-white/40 text-xs mb-2 text-center">Which class? (optional)</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => setSelectedClassId(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  selectedClassId === null
                    ? 'bg-white/15 border-white/30 text-white'
                    : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                Open gym
              </button>
              {todayClasses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClassId(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    selectedClassId === c.id
                      ? 'bg-red-600/20 border-red-500/40 text-red-200'
                      : 'bg-white/5 border-white/10 text-white/50'
                  }`}
                >
                  {c.name}
                  {c.start_time ? ` · ${c.start_time}` : ''}
                </button>
              ))}
            </div>
          </div>
        )}

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

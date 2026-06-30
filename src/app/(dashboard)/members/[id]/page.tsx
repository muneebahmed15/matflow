'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffInfo } from '@/lib/permissions'
import { useParams, useRouter } from 'next/navigation'
import { getMemberSignatures } from '@/lib/waivers'
import { useAppUi } from '@/components/ui/AppUiProvider'
import PageLoader from '@/components/PageLoader'
import ErrorState from '@/components/ErrorState'

interface Member {
  id: string; first_name: string; last_name: string
  email: string; phone: string; belt_rank: string; status: string
}
interface Plan {
  id: string; name: string; stripe_price_id: string; price_cents: number; interval: string
}
interface AttendanceRecord {
  id: string; checked_in_at: string
}
interface WaiverSig {
  id: string; signed_at: string; waivers: { title: string }
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { confirm, error: showError } = useAppUi()
  const [member, setMember] = useState<Member | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [signatures, setSignatures] = useState<WaiverSig[]>([])
  const [gymId, setGymId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'waivers'>('info')

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    const info = await getCurrentStaffInfo()
    if (!info.gymId) return
    setGymId(info.gymId)
    const { data: plansData } = await supabase
      .from('plans')
      .select('id, name, stripe_price_id, price_cents, interval')
      .eq('gym_id', info.gymId)
    setPlans(plansData || [])
    const { data: memberData } = await supabase.from('members').select('*').eq('id', id).eq('gym_id', info.gymId).single()
    if (memberData) setMember(memberData)
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('id, checked_in_at')
      .eq('member_id', id)
      .order('checked_in_at', { ascending: false })
      .limit(10)
    setAttendance(attendanceData || [])
    const sigs = await getMemberSignatures(id)
    setSignatures(sigs as WaiverSig[])
    setLoading(false)
  }

  async function handleSubscribe(stripePriceId: string) {
    if (!member || !gymId) return
    setSubscribing(true)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripe_price_id: stripePriceId,
          member_id: member.id,
          gym_id: gymId,
          member_email: member.email,
        }),
      })
      const { url, error } = await res.json()
      if (error) { showError(error); return }
      if (url) window.location.href = url
    } catch { showError('Failed to start checkout') }
    finally { setSubscribing(false) }
  }

  const handleEdit = async (field: string, value: string) => {
    if (!member) return
    const { error } = await supabase.from('members').update({ [field]: value }).eq('id', member.id)
    if (!error) setMember({ ...member, [field]: value })
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete member',
      message: 'This permanently removes the member and their records.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    await supabase.from('members').delete().eq('id', id)
    router.push('/members')
  }

  if (loading) return <PageLoader />
  if (!member) return <ErrorState message="Member not found." />

  const tabs = [
    { key: 'info', label: 'Info' },
    { key: 'attendance', label: `Attendance (${attendance.length})` },
    { key: 'waivers', label: `Waivers (${signatures.length})` },
  ]

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.push('/members')} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
        ← Back to Members
      </button>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{member.first_name} {member.last_name}</h1>
            <p className="text-white/40 text-sm">{member.email}</p>
          </div>
          <button onClick={handleDelete} className="text-red-500 text-sm hover:underline">Delete</button>
        </div>

        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as 'info' | 'attendance' | 'waivers')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition ${activeTab === tab.key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'info' && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between border-b border-white/10 pb-3">
            <span className="text-gray-400 text-sm">Phone</span>
            <span className="text-white text-sm">{member.phone || '—'}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-3">
            <span className="text-gray-400 text-sm">Belt Rank</span>
            <select value={member.belt_rank} onChange={(e) => handleEdit('belt_rank', e.target.value)}
              className="bg-transparent text-white text-sm capitalize cursor-pointer">
              {['white','yellow','orange','green','blue','purple','brown','black'].map(b => (
                <option key={b} value={b} className="bg-gray-900">{b}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Status</span>
            <select value={member.status} onChange={(e) => handleEdit('status', e.target.value)}
              className="bg-transparent text-sm cursor-pointer">
              <option value="active" className="bg-gray-900">active</option>
              <option value="inactive" className="bg-gray-900">inactive</option>
            </select>
          </div>
          <a href={`/waivers/${id}/sign-waiver`}
            className="block w-full text-center border border-white/10 text-gray-300 py-2 rounded-xl text-sm hover:bg-white/5 transition mt-2">
            ✍️ Sign Waiver for this Member
          </a>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Recent Attendance</h2>
          {attendance.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No attendance records yet.</p>
          ) : (
            <div className="space-y-2">
              {attendance.map((a) => (
                <div key={a.id} className="flex justify-between items-center bg-white/5 rounded-xl px-4 py-2.5">
                  <span className="text-white text-sm">
                    {new Date(a.checked_in_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-white/30 text-xs">
                    {new Date(a.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'waivers' && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Signed Waivers</h2>
          {signatures.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/30 text-sm mb-3">No waivers signed yet.</p>
              <a href={`/waivers/${id}/sign-waiver`} className="text-blue-400 text-sm hover:underline">Sign a waiver →</a>
            </div>
          ) : (
            <div className="space-y-2">
              {signatures.map((sig) => (
                <div key={sig.id} className="flex justify-between items-center bg-white/5 rounded-xl px-4 py-2.5">
                  <span className="text-white text-sm">{sig.waivers?.title}</span>
                  <span className="text-white/30 text-xs">{new Date(sig.signed_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'info' && plans.length > 0 && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Subscribe to Plan</h2>
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="flex justify-between items-center p-3 border border-white/10 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-white">{plan.name}</p>
                  <p className="text-xs text-gray-400">
                    ${plan.price_cents ? (plan.price_cents / 100).toFixed(2) : '0.00'} / {plan.interval}
                  </p>
                </div>
                <button
                  onClick={() => handleSubscribe(plan.stripe_price_id)}
                  disabled={subscribing || !plan.stripe_price_id}
                  className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                  {subscribing ? 'Loading...' : 'Subscribe'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'info' && plans.length === 0 && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-gray-400 text-sm">No active plans yet.</p>
          <a href="/plans" className="text-blue-400 text-sm hover:underline mt-2 inline-block">Create a plan →</a>
        </div>
      )}
    </div>
  )
}

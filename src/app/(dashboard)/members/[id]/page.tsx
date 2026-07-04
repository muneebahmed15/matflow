'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { redirectTo } from '@/lib/navigation'
import {
  inviteMemberToPortalAction,
  sendWaiverLinkAction,
  archiveMemberAction,
  updateMemberStripesAction,
  getMemberTimelineAction,
  getMemberDetailPageDataAction,
  updateMemberAction,
} from '@/app/(dashboard)/actions'
import MemberNotesPanel from '@/components/members/MemberNotesPanel'
import MemberEmergencyContactsPanel from '@/components/members/MemberEmergencyContactsPanel'

type TimelineEvent = {
  id: string
  type: string
  at: string
  title: string
  detail: string | null
}

const TIMELINE_COLORS: Record<string, string> = {
  note: 'bg-yellow-400',
  attendance: 'bg-green-400',
  promotion: 'bg-blue-400',
  waiver: 'bg-purple-400',
  subscription: 'bg-pink-400',
}

interface Member {
  id: string; first_name: string; last_name: string
  email: string; phone: string; belt_rank: string | null; status: string
  stripe_count?: number
}
interface Plan {
  id: string; name: string; stripe_price_id: string | null; price_cents: number | null; interval: string
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
  const [member, setMember] = useState<Member | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [signatures, setSignatures] = useState<WaiverSig[]>([])
  const [gymId, setGymId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [sendingWaiverLink, setSendingWaiverLink] = useState(false)
  const [waiverLinkMsg, setWaiverLinkMsg] = useState('')
  const [archiving, setArchiving] = useState(false)
  const [stripeUpdating, setStripeUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'waivers' | 'notes' | 'contacts' | 'timeline'>('info')
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [timelineLoaded, setTimelineLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadMember() {
      const result = await getMemberDetailPageDataAction(id)
      if (cancelled) return
      if (!result.ok || !result.data) {
        setLoading(false)
        return
      }
      setGymId(result.data.member.gym_id)
      setMember(result.data.member as Member)
      setPlans(result.data.plans)
      setAttendance(result.data.attendance)
      setSignatures(result.data.signatures as WaiverSig[])
      setLoading(false)
    }

    void loadMember()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (activeTab !== 'timeline' || timelineLoaded) return
    void (async () => {
      const result = await getMemberTimelineAction(id)
      if (result.ok && result.data) setTimeline(result.data)
      setTimelineLoaded(true)
    })()
  }, [activeTab, timelineLoaded, id])

  async function handleSubscribe(stripePriceId: string | null) {
    if (!member || !gymId || !stripePriceId) return
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
      if (error) { alert(error); return }
      if (url) redirectTo(url)
    } catch { alert('Failed to start checkout') }
    finally { setSubscribing(false) }
  }

  const handleEdit = async (field: string, value: string) => {
    if (!member) return
    const result = await updateMemberAction(member.id, { [field]: value })
    if (result.ok && result.data) setMember(result.data as Member)
  }

  const handleArchive = async () => {
    if (!confirm('Archive this member? They will be marked inactive.')) return
    setArchiving(true)
    const res = await archiveMemberAction(id)
    setArchiving(false)
    if (res.ok) {
      setMember((m) => (m ? { ...m, status: 'inactive' } : m))
    }
  }

  const handleStripeChange = async (next: number) => {
    if (!member) return
    setStripeUpdating(true)
    const res = await updateMemberStripesAction({ memberId: member.id, stripeCount: next })
    setStripeUpdating(false)
    if (res.ok) setMember({ ...member, stripe_count: next })
  }

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!member) return <div className="p-8 text-gray-400">Member not found.</div>

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'notes', label: 'Notes' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'attendance', label: `Attendance (${attendance.length})` },
    { key: 'waivers', label: `Waivers (${signatures.length})` },
  ]


  const stripeCount = member.stripe_count ?? 0

  const handleInvitePortal = async () => {
    if (!member?.email) {
      setInviteMsg('Add an email address first.')
      return
    }
    setInviting(true)
    setInviteMsg('')
    const res = await inviteMemberToPortalAction(member.id)
    setInviting(false)
    setInviteMsg(res.ok ? 'Portal invite sent.' : (res.error ?? 'Invite failed'))
  }

  const handleSendWaiverLink = async () => {
    if (!member?.email) {
      setWaiverLinkMsg('Add an email address first.')
      return
    }
    setSendingWaiverLink(true)
    setWaiverLinkMsg('')
    const res = await sendWaiverLinkAction(member.id)
    setSendingWaiverLink(false)
    setWaiverLinkMsg(res.ok ? 'Waiver link sent.' : (res.error ?? 'Failed to send waiver link'))
  }

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
          <button
            onClick={() => void handleArchive()}
            disabled={archiving || member.status === 'inactive'}
            className="text-amber-400 text-sm hover:underline disabled:opacity-40"
          >
            {archiving ? 'Archiving…' : 'Archive'}
          </button>
        </div>

        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
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
            <select value={member.belt_rank ?? 'white'} onChange={(e) => handleEdit('belt_rank', e.target.value)}
              className="bg-transparent text-white text-sm capitalize cursor-pointer">
              {['white','yellow','orange','green','blue','purple','brown','black'].map(b => (
                <option key={b} value={b} className="bg-gray-900">{b}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-3">
            <span className="text-gray-400 text-sm">Stripes</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={stripeUpdating || stripeCount <= 0}
                onClick={() => void handleStripeChange(stripeCount - 1)}
                className="w-7 h-7 rounded-lg bg-white/5 text-white/60 hover:text-white disabled:opacity-30"
              >
                −
              </button>
              <span className="text-white text-sm w-4 text-center">{stripeCount}</span>
              <button
                type="button"
                disabled={stripeUpdating || stripeCount >= 4}
                onClick={() => void handleStripeChange(stripeCount + 1)}
                className="w-7 h-7 rounded-lg bg-white/5 text-white/60 hover:text-white disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Status</span>
            <select value={member.status} onChange={(e) => handleEdit('status', e.target.value)}
              className="bg-transparent text-sm cursor-pointer">
              <option value="active" className="bg-gray-900">active</option>
              <option value="inactive" className="bg-gray-900">inactive</option>
            </select>
          </div>
          <div className="border-t border-white/10 pt-4">
            <button
              onClick={() => void handleInvitePortal()}
              disabled={inviting || !member.email}
              className="text-sm text-blue-400 hover:underline disabled:opacity-40"
            >
              {inviting ? 'Sending invite...' : 'Invite to member portal'}
            </button>
            {inviteMsg && <p className="text-xs text-white/40 mt-1">{inviteMsg}</p>}
            <button
              onClick={() => void handleSendWaiverLink()}
              disabled={sendingWaiverLink || !member.email}
              className="block text-sm text-blue-400 hover:underline disabled:opacity-40 mt-2"
            >
              {sendingWaiverLink ? 'Sending waiver link...' : 'Email waiver sign link'}
            </button>
            {waiverLinkMsg && <p className="text-xs text-white/40 mt-1">{waiverLinkMsg}</p>}
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

      {activeTab === 'timeline' && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Activity Timeline</h2>
          {!timelineLoaded ? (
            <p className="text-white/30 text-sm">Loading...</p>
          ) : timeline.length === 0 ? (
            <p className="text-white/30 text-sm">No activity recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((e) => (
                <div key={e.id} className="flex gap-3">
                  <div className="flex flex-col items-center pt-1.5">
                    <div className={`w-2 h-2 rounded-full ${TIMELINE_COLORS[e.type] ?? 'bg-white/40'}`} />
                    <div className="flex-1 w-px bg-white/10 mt-1" />
                  </div>
                  <div className="pb-3 min-w-0">
                    <p className="text-white text-sm">{e.title}</p>
                    {e.detail && <p className="text-white/40 text-xs mt-0.5 whitespace-pre-wrap">{e.detail}</p>}
                    <p className="text-white/20 text-xs mt-0.5">
                      {new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">CRM Notes</h2>
          <MemberNotesPanel memberId={id} />
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Emergency Contacts</h2>
          <MemberEmergencyContactsPanel memberId={id} />
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
                  onClick={() => { if (plan.stripe_price_id) void handleSubscribe(plan.stripe_price_id) }}
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

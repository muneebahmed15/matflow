'use client'

import { useEffect, useState } from 'react'
import { hasCapability } from '@/lib/permissions/capabilities'
import { Award, Plus, Download, CheckCircle2 } from 'lucide-react'
import {
  promoteMemberAction,
  undoPromotionAction,
  getPromotionReadinessAction,
  getPromotionForecastAction,
  listPromotionRequestsAction,
  reviewPromotionRequestAction,
  proposePromotionAction,
  getGymBeltSystemAction,
  listBeltRequirementsAction,
  saveBeltRequirementAction,
  exportMembersByBeltCsvAction,
  getBeltsPageDataAction,
  getStaffContextAction,
  bulkPromoteMembersAction,
  downloadPromotionCertificateAction,
} from '@/app/(dashboard)/actions'
import { BELT_COLORS } from '@/lib/belt-colors'
import { useAppUi } from '@/components/ui/AppUiProvider'

interface Member {
  id: string
  first_name: string
  last_name: string
  belt_rank: string | null
  email: string | null
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

interface Readiness {
  memberId: string
  firstName: string
  lastName: string
  belt: string
  daysAtRank: number
  attendanceSinceRank: number
  ready: boolean
  hasRequirement: boolean
  missingAttendance: number
  missingDays: number
}

interface RequirementRow {
  id: string
  belt: string
  min_attendance: number
  min_days_at_rank: number
}

const beltBadge = (belt: string | null) => BELT_COLORS[belt ?? ''] ?? 'bg-white/10 text-white'

export default function BeltsPage() {
  const { confirm, error: showError, success: showSuccess } = useAppUi()
  const [members, setMembers] = useState<Member[]>([])
  const [promotions, setPromotions] = useState<BeltPromotion[]>([])
  const [readiness, setReadiness] = useState<Readiness[]>([])
  const [requirements, setRequirements] = useState<RequirementRow[]>([])
  const [beltRanks, setBeltRanks] = useState<string[]>(['white', 'blue', 'purple', 'brown', 'black'])
  const [gymId, setGymId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [canPromote, setCanPromote] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showRequirements, setShowRequirements] = useState(false)
  const [selectedMember, setSelectedMember] = useState('')
  const [toBelt, setToBelt] = useState('blue')
  const [ceremonyDate, setCeremonyDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ceremonySelected, setCeremonySelected] = useState<Set<string>>(new Set())
  const [ceremonyNotes, setCeremonyNotes] = useState('')
  const [ceremonyDateBulk, setCeremonyDateBulk] = useState('')
  const [forecast, setForecast] = useState<{ belt: string; readyNow: number; likelyNext30Days: number }[]>([])
  const [pendingRequests, setPendingRequests] = useState<
    { id: string; from_belt: string; to_belt: string; notes: string | null; members: { first_name: string; last_name: string } | null }[]
  >([])

  // requirements editor state
  const [reqBelt, setReqBelt] = useState('white')
  const [reqAttendance, setReqAttendance] = useState('50')
  const [reqDays, setReqDays] = useState('365')

  const reload = async () => {
    const [pageResult, readyResult, reqResult, forecastResult, requestsResult] = await Promise.all([
      getBeltsPageDataAction(),
      getPromotionReadinessAction(),
      listBeltRequirementsAction(),
      getPromotionForecastAction(),
      listPromotionRequestsAction(),
    ])
    if (pageResult.ok && pageResult.data) {
      setMembers(pageResult.data.members)
      setPromotions(pageResult.data.promotions as BeltPromotion[])
    }
    if (readyResult.ok && readyResult.data) setReadiness(readyResult.data)
    if (reqResult.ok && reqResult.data) setRequirements(reqResult.data)
    if (forecastResult.ok && forecastResult.data) setForecast(forecastResult.data)
    if (requestsResult.ok && requestsResult.data) setPendingRequests(requestsResult.data)
  }

  useEffect(() => {
    const load = async () => {
      const context = await getStaffContextAction()
      if (!context.ok || !context.data) return
      setGymId(context.data.gymId)
      setIsAdmin(context.data.role === 'admin')
      const basePromote = hasCapability(context.data.role, 'belts.promote')
      const coachStripesOnly =
        context.data.coachesStripesOnly && context.data.role === 'coach'
      setCanPromote(basePromote && !coachStripesOnly)

      const systemResult = await getGymBeltSystemAction()
      if (systemResult.ok && systemResult.data) {
        setBeltRanks(systemResult.data.belts)
        setToBelt(systemResult.data.belts[1] ?? systemResult.data.belts[0])
      }

      await reload()
      setLoading(false)
    }
    void load()
  }, [])

  const handlePromote = async () => {
    if (!selectedMember || !gymId) return
    setSubmitting(true)
    const member = members.find(m => m.id === selectedMember)
    if (!member) { setSubmitting(false); return }

    const result = await promoteMemberAction({
      memberId: selectedMember,
      fromBelt: member.belt_rank ?? 'white',
      toBelt,
      notes,
      ceremonyDate: ceremonyDate || null,
    })
    if (!result.ok) {
      showError(result.error)
      setSubmitting(false)
      return
    }
    await reload()
    setSelectedMember('')
    setNotes('')
    setCeremonyDate('')
    setShowForm(false)
    setSubmitting(false)
    showSuccess('Promotion logged')
  }

  const handleUndo = async (promotionId: string) => {
    if (!gymId) return
    const ok = await confirm({
      title: 'Undo promotion',
      message: 'This deletes the promotion record and reverts the member to their previous belt.',
      confirmLabel: 'Undo',
      destructive: true,
    })
    if (!ok) return
    const result = await undoPromotionAction(promotionId)
    if (!result.ok) { showError(result.error); return }
    await reload()
    showSuccess('Promotion undone')
  }

  const handleSaveRequirement = async () => {
    if (!gymId) return
    const result = await saveBeltRequirementAction({
      belt: reqBelt,
      minAttendance: parseInt(reqAttendance, 10) || 0,
      minDaysAtRank: parseInt(reqDays, 10) || 0,
    })
    if (!result.ok) { showError(result.error); return }
    await reload()
    showSuccess('Requirement saved')
  }

  const handleExport = async () => {
    const result = await exportMembersByBeltCsvAction()
    if (!result.ok || !result.data) {
      showError(!result.ok ? result.error : 'Export failed')
      return
    }
    const blob = new Blob([result.data], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'members-by-belt.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedMemberData = members.find(m => m.id === selectedMember)
  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const readyMembers = readiness.filter(r => r.ready)
  const nextBeltFor = (belt: string) => {
    const idx = beltRanks.indexOf(belt)
    return idx >= 0 && idx < beltRanks.length - 1 ? beltRanks[idx + 1] : null
  }

  const handleCeremonyPromote = async () => {
    if (!canPromote || ceremonySelected.size === 0) return
    setSubmitting(true)
    const promotions = [...ceremonySelected]
      .map((memberId) => {
        const row = readiness.find((r) => r.memberId === memberId)
        if (!row) return null
        const to = nextBeltFor(row.belt)
        if (!to) return null
        return { memberId, fromBelt: row.belt, toBelt: to }
      })
      .filter((p): p is { memberId: string; fromBelt: string; toBelt: string } => p !== null)

    const result = await bulkPromoteMembersAction({
      promotions,
      notes: ceremonyNotes || 'Belt ceremony batch promotion',
      ceremonyDate: ceremonyDateBulk || null,
    })
    setSubmitting(false)
    if (!result.ok) {
      showError(result.error)
      return
    }
    if (result.data?.errors.length) {
      showError(`${result.data.promoted} promoted. ${result.data.errors.length} failed.`)
    } else {
      showSuccess(`Promoted ${result.data?.promoted ?? 0} member(s)`)
    }
    setCeremonySelected(new Set())
    setCeremonyNotes('')
    await reload()
  }

  const handleDownloadCertificate = async (promotionId: string) => {
    const result = await downloadPromotionCertificateAction(promotionId)
    if (!result.ok || !result.data) {
      showError(!result.ok ? result.error : 'Download failed')
      return
    }
    const bytes = Uint8Array.from(atob(result.data.base64), (c) => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.data.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadShareImage = (promo: BeltPromotion) => {
    const member = promo.members
    const params = new URLSearchParams({
      member_name: `${member.first_name} ${member.last_name}`,
      from_belt: promo.from_belt,
      to_belt: promo.to_belt,
      promoted_at: promo.promoted_at,
    })
    window.open(`/api/belts/share-image?${params.toString()}`, '_blank')
  }

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Belt Promotions</h1>
          <p className="text-white/40 text-sm mt-1">Track and log member belt promotions.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void handleExport()} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm font-semibold px-4 py-2.5 rounded-xl transition">
            <Download size={16} /> Export CSV
          </button>
          {canPromote && (
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
              <Plus size={16} /> Promote Member
            </button>
          )}
        </div>
      </div>

      {forecast.length > 0 && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-white mb-3">Promotion forecast (next 30 days)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {forecast.map((f) => (
              <div key={f.belt} className="bg-white/5 rounded-xl p-3 text-sm">
                <p className="capitalize font-medium text-white">{f.belt} belt</p>
                <p className="text-green-400 text-xs mt-1">{f.readyNow} ready now</p>
                <p className="text-white/40 text-xs">{f.likelyNext30Days} likely in 30 days</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && pendingRequests.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-amber-200">Pending promotion requests ({pendingRequests.length})</h2>
          {pendingRequests.map((req) => (
            <div key={req.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-white">
                {req.members?.first_name} {req.members?.last_name}: {req.from_belt} → {req.to_belt}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const result = await reviewPromotionRequestAction(req.id, true)
                    if (!result.ok) showError(result.error)
                    else { showSuccess('Promotion approved'); await reload() }
                  }}
                  className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const result = await reviewPromotionRequestAction(req.id, false)
                    if (!result.ok) showError(result.error)
                    else { showSuccess('Request rejected'); await reload() }
                  }}
                  className="px-3 py-1 rounded-lg bg-white/10 text-white/70 text-xs"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {readyMembers.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 mb-6 space-y-4">
          <p className="text-green-300 font-semibold text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> Ready for promotion ({readyMembers.length})
          </p>
          <div className="space-y-2">
            {readyMembers.map(r => (
              <label key={r.memberId} className="flex items-center justify-between text-sm gap-3">
                <span className="flex items-center gap-2 text-white">
                  {canPromote && (
                    <input
                      type="checkbox"
                      checked={ceremonySelected.has(r.memberId)}
                      onChange={(e) => {
                        setCeremonySelected((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(r.memberId)
                          else next.delete(r.memberId)
                          return next
                        })
                      }}
                    />
                  )}
                  {r.firstName} {r.lastName}
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-xs capitalize ${beltBadge(r.belt)}`}>{r.belt}</span>
                  {nextBeltFor(r.belt) && (
                    <span className="text-white/30 text-xs">→ {nextBeltFor(r.belt)}</span>
                  )}
                </span>
                <span className="text-white/40 text-xs">
                  {r.attendanceSinceRank} classes · {r.daysAtRank} days at rank
                </span>
              </label>
            ))}
          </div>
          {canPromote && ceremonySelected.size > 0 && (
            <div className="border-t border-green-500/20 pt-4 space-y-3">
              <p className="text-green-200 text-xs font-medium">Belt ceremony mode — promote {ceremonySelected.size} selected</p>
              <input
                type="date"
                value={ceremonyDateBulk}
                onChange={(e) => setCeremonyDateBulk(e.target.value)}
                className={inputClass}
              />
              <input
                value={ceremonyNotes}
                onChange={(e) => setCeremonyNotes(e.target.value)}
                placeholder="Ceremony notes (optional)"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => void handleCeremonyPromote()}
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                {submitting ? 'Promoting...' : `Promote ${ceremonySelected.size} member(s)`}
              </button>
            </div>
          )}
        </div>
      )}

      {showForm && canPromote && (
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
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${beltBadge(selectedMemberData.belt_rank ?? 'white')}`}>
                  {selectedMemberData.belt_rank ?? 'white'}
                </span>
              </div>
              <div className="text-white/20 text-lg">→</div>
              <div>
                <p className="text-white/40 text-xs mb-1">Promoting To</p>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${beltBadge(toBelt)}`}>
                  {toBelt}
                </span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Promote To</label>
              <select value={toBelt} onChange={(e) => setToBelt(e.target.value)} className={inputClass}>
                {beltRanks.map(b => (
                  <option key={b} value={b} className="bg-gray-900 capitalize">{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ceremony date (optional)</label>
              <input type="date" value={ceremonyDate} onChange={(e) => setCeremonyDate(e.target.value)} className={inputClass} />
            </div>
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
          {beltRanks.map(belt => {
            const count = members.filter(m => m.belt_rank === belt).length
            return (
              <div key={belt} className={`rounded-xl p-3 border border-white/10 ${count > 0 ? '' : 'opacity-30'}`}>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${beltBadge(belt)}`}>{belt}</span>
                <p className="text-2xl font-bold text-white mt-2">{count}</p>
                <p className="text-white/30 text-xs">members</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Promotion requirements (admin) */}
      {isAdmin && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Promotion Requirements</h2>
            <button onClick={() => setShowRequirements(!showRequirements)} className="text-white/40 hover:text-white text-xs">
              {showRequirements ? 'Hide' : 'Edit'}
            </button>
          </div>
          {requirements.length > 0 && (
            <div className="mt-3 space-y-1">
              {requirements.map(r => (
                <p key={r.id} className="text-white/50 text-xs">
                  <span className={`px-1.5 py-0.5 rounded text-xs capitalize mr-2 ${beltBadge(r.belt)}`}>{r.belt}</span>
                  {r.min_attendance} classes · {r.min_days_at_rank} days at rank before next promotion
                </p>
              ))}
            </div>
          )}
          {showRequirements && (
            <div className="mt-4 grid grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Belt</label>
                <select value={reqBelt} onChange={(e) => setReqBelt(e.target.value)} className={inputClass}>
                  {beltRanks.map(b => <option key={b} value={b} className="bg-gray-900 capitalize">{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Min classes</label>
                <input type="number" value={reqAttendance} onChange={(e) => setReqAttendance(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Min days at rank</label>
                <input type="number" value={reqDays} onChange={(e) => setReqDays(e.target.value)} className={inputClass} />
              </div>
              <button onClick={() => void handleSaveRequirement()} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition">
                Save
              </button>
            </div>
          )}
        </div>
      )}

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
                      <span className={`px-1.5 py-0.5 rounded text-xs capitalize ${beltBadge(p.from_belt)}`}>{p.from_belt}</span>
                      <span className="text-white/20 text-xs">→</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs capitalize ${beltBadge(p.to_belt)}`}>{p.to_belt}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/30 text-xs">{new Date(p.promoted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  {p.notes && <p className="text-white/20 text-xs mt-0.5 max-w-32 truncate">{p.notes}</p>}
                  <button
                    type="button"
                    onClick={() => void handleDownloadCertificate(p.id)}
                    className="text-blue-400 text-xs hover:underline mt-1"
                  >
                    Certificate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadShareImage(p)}
                    className="text-purple-400 text-xs hover:underline mt-1 block"
                  >
                    Share image
                  </button>
                  {isAdmin && (
                    <button onClick={() => void handleUndo(p.id)} className="text-white/20 hover:text-red-400 text-xs mt-1 transition">
                      Undo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

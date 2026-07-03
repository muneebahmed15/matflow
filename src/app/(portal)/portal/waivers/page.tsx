'use client'

import { useEffect, useState } from 'react'
import {
  getWaivers,
  getMemberSignatures,
  latestSignatureByWaiverId,
  waiverStatusFromSignature,
  type Waiver,
  type WaiverSignatureStatus,
} from '@/lib/waivers'
import type { MemberSignatureSummary } from '@/types/queries'
import WaiverSignatureBox from '@/components/WaiverSignatureBox'
import { AlertCircle, CheckCircle2, FileText, Download } from 'lucide-react'
import { usePortalMember } from '@/lib/portal-member-context'
import { ListSkeleton } from '@/components/LoadingSkeleton'

type SignedWaiver = MemberSignatureSummary & {
  id?: string;
  expires_at?: string | null;
  waivers?: { title: string } | null;
};

const STATUS_STYLES: Record<WaiverSignatureStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  signed: { label: 'Signed', className: 'bg-green-500/15 text-green-300 border-green-500/30' },
  expired: { label: 'Expired', className: 'bg-red-500/15 text-red-300 border-red-500/30' },
};

function isMinorDob(dob: string | null | undefined, now: number): boolean {
  if (!dob) return false;
  const age = (now - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return age < 18;
}

function StatusBadge({ status }: { status: WaiverSignatureStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${style.className}`}>
      {style.label}
    </span>
  );
}

export default function PortalWaiversPage() {
  const { activeMember } = usePortalMember()
  const [waivers, setWaivers] = useState<Waiver[]>([])
  const [signed, setSigned] = useState<SignedWaiver[]>([])
  const [statusByWaiver, setStatusByWaiver] = useState<Map<string, {
    status: WaiverSignatureStatus;
    signedAt?: string;
    signatureId?: string;
  }>>(new Map())
  const [selected, setSelected] = useState<Waiver | null>(null)
  const [alreadySigned, setAlreadySigned] = useState(false)
  const [signedAt, setSignedAt] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [now] = useState(() => Date.now())

  const memberId = activeMember?.id
  const gymId = activeMember?.gym_id
  const memberName = activeMember ? `${activeMember.first_name} ${activeMember.last_name}` : ''

  const applyWaiverState = (active: Waiver[], sigs: SignedWaiver[], focusId?: string) => {
    const latest = latestSignatureByWaiverId(sigs)
    const statuses = new Map<string, { status: WaiverSignatureStatus; signedAt?: string; signatureId?: string }>()
    for (const w of active) {
      const sig = latest.get(w.id)
      statuses.set(w.id, {
        status: waiverStatusFromSignature(sig),
        signedAt: sig?.signed_at,
        signatureId: sig?.id,
      })
    }
    setStatusByWaiver(statuses)

    const target = focusId ? active.find((w) => w.id === focusId) ?? active[0] : active[0]
    if (target) {
      setSelected(target)
      const info = statuses.get(target.id)
      const isSigned = info?.status === 'signed'
      setAlreadySigned(isSigned)
      setSignedAt(isSigned ? info?.signedAt : undefined)
    }
  }

  useEffect(() => {
    if (!memberId || !gymId) return
    const load = async () => {
      const gymWaivers = await getWaivers(gymId)
      const active = gymWaivers.filter((w) => w.is_active)
      setWaivers(active)
      const sigs = await getMemberSignatures(memberId)
      setSigned(sigs as SignedWaiver[])
      applyWaiverState(active, sigs as SignedWaiver[])
      setLoading(false)
    }
    void load()
  }, [memberId, gymId])

  const handleSelectWaiver = (waiver: Waiver) => {
    setSelected(waiver)
    setSuccess(false)
    const info = statusByWaiver.get(waiver.id)
    const isSigned = info?.status === 'signed'
    setAlreadySigned(isSigned)
    setSignedAt(isSigned ? info?.signedAt : undefined)
  }

  const handleSign = async (typedName: string, guardianName?: string) => {
    if (!selected || !memberId) return
    const res = await fetch('/api/portal/waivers/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        waiver_id: selected.id,
        member_id: memberId,
        signed_name: typedName,
        guardian_name: guardianName,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error ?? 'Failed to sign waiver.')
    }
    setSuccess(true)
    const sigs = await getMemberSignatures(memberId)
    setSigned(sigs as SignedWaiver[])
    applyWaiverState(waivers, sigs as SignedWaiver[], selected.id)
  }

  if (loading || !activeMember) {
    return <ListSkeleton count={4} />
  }

  const pendingWaivers = waivers.filter((w) => {
    const status = statusByWaiver.get(w.id)?.status
    return status === 'pending' || status === 'expired'
  })

  const selectedStatus = selected ? statusByWaiver.get(selected.id)?.status : undefined

  const isMinor = isMinorDob(activeMember.date_of_birth, now)

  return (
    <div className="space-y-6">
      <div>
        <a href="/portal" className="text-sm text-gray-400 hover:text-white">← Back</a>
        <h1 className="text-2xl font-bold mt-2">My Waivers</h1>
        {memberName && activeMember && (
          <p className="text-white/40 text-sm mt-1">Signing as {memberName}</p>
        )}
      </div>

      {pendingWaivers.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4">
          <p className="text-amber-300 text-sm font-medium flex items-center gap-2">
            <AlertCircle size={16} />
            Action required
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {pendingWaivers.map((w) => {
              const status = statusByWaiver.get(w.id)?.status ?? 'pending'
              return (
                <li key={w.id} className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectWaiver(w)}
                    className="text-white/80 hover:text-white text-left"
                  >
                    {w.title}
                  </button>
                  <StatusBadge status={status} />
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {signed.length > 0 && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-4 space-y-2">
          <p className="text-white/50 text-xs font-medium flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-green-400" />
            Signed documents
          </p>
          {signed.map((sig) => {
            const status = waiverStatusFromSignature(sig)
            if (status !== 'signed') return null
            return (
              <div key={sig.id ?? sig.waiver_id} className="flex justify-between items-center text-sm gap-3">
                <span className="text-white/70">{sig.waivers?.title ?? 'Waiver'}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status="signed" />
                  {sig.id && (
                    <a
                      href={`/api/portal/waivers/${sig.id}/download`}
                      className="flex items-center gap-1 text-blue-400 text-xs hover:underline"
                    >
                      <Download size={12} /> PDF
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {waivers.length === 0 ? (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-12 text-center">
          <FileText size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/30">No waivers available.</p>
        </div>
      ) : (
        <>
          {waivers.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {waivers.map((w) => {
                const status = statusByWaiver.get(w.id)?.status ?? 'pending'
                return (
                  <button
                    key={w.id}
                    onClick={() => handleSelectWaiver(w)}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition flex items-center gap-2 ${
                      selected?.id === w.id
                        ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                        : 'border-white/10 bg-white/5 text-gray-300'
                    }`}
                  >
                    {w.title}
                    <StatusBadge status={status} />
                  </button>
                )
              })}
            </div>
          )}
          {selected && (
            <div className="bg-[#111] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="font-semibold">{selected.title}</h2>
                {selectedStatus && <StatusBadge status={selectedStatus} />}
              </div>
              {selectedStatus === 'expired' && (
                <p className="text-red-300/80 text-xs mb-3">
                  Your previous signature has expired. Please sign again to continue training.
                </p>
              )}
              <div className="max-h-64 overflow-y-auto bg-black/30 rounded-xl p-4 mb-4">
                <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {selected.body}
                </pre>
              </div>
              {success && (
                <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                  <p className="text-green-400 font-semibold">Waiver signed successfully!</p>
                </div>
              )}
              <WaiverSignatureBox
                memberName={memberName}
                onSign={handleSign}
                alreadySigned={alreadySigned}
                signedAt={signedAt}
                requireGuardian={isMinor}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

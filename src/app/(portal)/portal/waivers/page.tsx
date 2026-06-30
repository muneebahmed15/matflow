'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getWaivers, getMemberSignatures, signWaiver, hasSignedWaiver, type Waiver } from '@/lib/waivers'
import type { MemberSignatureSummary } from '@/types/queries'
import WaiverSignatureBox from '@/components/WaiverSignatureBox'
import { FileText } from 'lucide-react'

interface SignedWaiver extends MemberSignatureSummary {}

export default function PortalWaiversPage() {
  const [waivers, setWaivers] = useState<Waiver[]>([])
  const [signed, setSigned] = useState<SignedWaiver[]>([])
  const [selected, setSelected] = useState<Waiver | null>(null)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [gymId, setGymId] = useState<string | null>(null)
  const [memberName, setMemberName] = useState('')
  const [alreadySigned, setAlreadySigned] = useState(false)
  const [signedAt, setSignedAt] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: member } = await supabase.from('members').select('id, first_name, last_name, gym_id').eq('email', user.email).single()
      if (!member) return
      setMemberId(member.id)
      setGymId(member.gym_id)
      setMemberName(`${member.first_name} ${member.last_name}`)
      const gymWaivers = await getWaivers(member.gym_id)
      const active = gymWaivers.filter(w => w.is_active)
      setWaivers(active)
      const sigs = await getMemberSignatures(member.id)
      setSigned(sigs as SignedWaiver[])
      if (active.length > 0) {
        setSelected(active[0])
        const s = await hasSignedWaiver(active[0].id, member.id)
        setAlreadySigned(s)
        if (s) {
          const match = sigs.find((sig) => sig.waiver_id === active[0].id)
          setSignedAt(match?.signed_at)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSelectWaiver = async (waiver: Waiver) => {
    if (!memberId) return
    setSelected(waiver)
    setSuccess(false)
    const s = await hasSignedWaiver(waiver.id, memberId)
    setAlreadySigned(s)
    if (s) {
      const match = signed.find((sig) => sig.waiver_id === waiver.id)
      setSignedAt(match?.signed_at)
    } else {
      setSignedAt(undefined)
    }
  }

  const handleSign = async (typedName: string) => {
    if (!selected || !memberId || !gymId) return
    await signWaiver(selected.id, memberId, gymId, typedName)
    setAlreadySigned(true)
    setSignedAt(new Date().toISOString())
    setSuccess(true)
  }

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <a href="/portal" className="text-sm text-gray-400 hover:text-white">← Back</a>
        <h1 className="text-2xl font-bold mt-2">My Waivers</h1>
      </div>

      {waivers.length === 0 ? (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-12 text-center">
          <FileText size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/30">No waivers available.</p>
        </div>
      ) : (
        <>
          {waivers.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {waivers.map(w => (
                <button key={w.id} onClick={() => handleSelectWaiver(w)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${selected?.id === w.id ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-white/10 bg-white/5 text-gray-300'}`}>
                  {w.title}
                </button>
              ))}
            </div>
          )}
          {selected && (
            <div className="bg-[#111] border border-white/10 rounded-2xl p-5">
              <h2 className="font-semibold mb-3">{selected.title}</h2>
              <div className="max-h-64 overflow-y-auto bg-black/30 rounded-xl p-4 mb-4">
                <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{selected.body}</pre>
              </div>
              {success && (
                <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                  <p className="text-green-400 font-semibold">✅ Waiver signed successfully!</p>
                </div>
              )}
              <WaiverSignatureBox memberName={memberName} onSign={handleSign} alreadySigned={alreadySigned} signedAt={signedAt} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

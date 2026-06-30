'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getWaiverById, getSignaturesForWaiver, toggleWaiverStatus, type Waiver } from '@/lib/waivers'
import { ToggleLeft, ToggleRight } from 'lucide-react'

type Signature = {
  id: string; signed_name: string; signed_at: string
  members: { first_name: string; last_name: string; email: string }
}

export default function WaiverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [waiver, setWaiver] = useState<Waiver | null>(null)
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [w, sigs] = await Promise.all([getWaiverById(id), getSignaturesForWaiver(id)])
      setWaiver(w)
      setSignatures(sigs as Signature[])
      setLoading(false)
    }
    load()
  }, [id])

  const handleToggle = async () => {
    if (!waiver) return
    setToggling(true)
    await toggleWaiverStatus(waiver.id, !waiver.is_active)
    setWaiver({ ...waiver, is_active: !waiver.is_active })
    setToggling(false)
  }

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!waiver) return <div className="p-8 text-gray-400">Waiver not found.</div>

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">← Back</button>
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{waiver.title}</h1>
            <p className="text-xs text-white/30 mt-1">Created {new Date(waiver.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${waiver.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-white/30 border border-white/10'}`}>
              {waiver.is_active ? 'Active' : 'Inactive'}
            </span>
            <button onClick={handleToggle} disabled={toggling} className="text-white/40 hover:text-white transition">
              {waiver.is_active ? <ToggleRight size={24} className="text-green-400" /> : <ToggleLeft size={24} />}
            </button>
          </div>
        </div>
        <div className="bg-black/30 rounded-xl p-4 max-h-64 overflow-y-auto">
          <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{waiver.body}</pre>
        </div>
      </div>
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">Signatures ({signatures.length})</h2>
        {signatures.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">No signatures yet.</p>
        ) : (
          <div className="space-y-2">
            {signatures.map((sig) => (
              <div key={sig.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <div>
                  <p className="text-white text-sm font-medium">{sig.members.first_name} {sig.members.last_name}</p>
                  <p className="text-white/30 text-xs">{sig.members.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-xs italic">&ldquo;{sig.signed_name}&rdquo;</p>
                  <p className="text-white/20 text-xs">{new Date(sig.signed_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

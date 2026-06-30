'use client'

import { useEffect, useState } from 'react'
import { listWaiversAction, toggleWaiverStatusAction } from '@/app/(dashboard)/actions'
import type { Waiver } from '@/services/waivers'
import Link from 'next/link'
import { FileText, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAppUi } from '@/components/ui/AppUiProvider'
import PageLoader from '@/components/PageLoader'

export default function WaiversPage() {
  const { error: showError } = useAppUi()
  const [waivers, setWaivers] = useState<Waiver[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const result = await listWaiversAction()
      if (result.ok && result.data) setWaivers(result.data)
      else if (!result.ok) showError(result.error)
      setLoading(false)
    })()
  }, [showError])

  const handleToggle = async (waiver: Waiver) => {
    setToggling(waiver.id)
    const result = await toggleWaiverStatusAction(waiver.id, !waiver.is_active)
    if (result.ok) {
      setWaivers((prev) => prev.map((w) => w.id === waiver.id ? { ...w, is_active: !w.is_active } : w))
    } else {
      showError(result.error)
    }
    setToggling(null)
  }

  if (loading) return <PageLoader />

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Waivers</h1>
          <p className="text-white/40 text-sm mt-1">Manage digital liability waivers.</p>
        </div>
        <Link href="/waivers/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          <Plus size={16} /> New Waiver
        </Link>
      </div>

      {waivers.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <FileText size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No waivers yet</p>
          <Link href="/waivers/new" className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
            <Plus size={16} /> Create Waiver
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {waivers.map((waiver) => (
            <div key={waiver.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className={waiver.is_active ? 'text-blue-400' : 'text-white/20'} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{waiver.title}</p>
                  <p className="text-xs text-white/30 mt-0.5">Created {new Date(waiver.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${waiver.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-white/30 border border-white/10'}`}>
                  {waiver.is_active ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => handleToggle(waiver)} disabled={toggling === waiver.id} className="text-white/40 hover:text-white transition disabled:opacity-50">
                  {waiver.is_active ? <ToggleRight size={22} className="text-green-400" /> : <ToggleLeft size={22} />}
                </button>
                <Link href={`/waivers/${waiver.id}`} className="text-sm text-blue-400 hover:underline">View</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

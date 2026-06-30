'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAppUi } from '@/components/ui/AppUiProvider'
import PageLoader from '@/components/PageLoader'
import { getGymSettingsAction, updateGymSettingsAction } from '@/app/(dashboard)/actions'

export default function SettingsPage() {
  const router = useRouter()
  const { error: showError, success } = useAppUi()
  const [gymName, setGymName] = useState('')
  const [slug, setSlug] = useState('')
  const [kioskEnabled, setKioskEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    void (async () => {
      const result = await getGymSettingsAction()
      if (result.ok && result.data) {
        setGymName(result.data.name || '')
        setSlug(result.data.slug || '')
        setKioskEnabled(Boolean(result.data.kiosk_enabled))
      } else if (!result.ok) {
        showError(result.error)
      }
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email || '')
      setLoading(false)
    })()
  }, [showError])

  const handleSave = async () => {
    setSaving(true)
    const result = await updateGymSettingsAction({
      name: gymName,
      slug,
      kioskEnabled,
    })
    setSaving(false)
    if (!result.ok) {
      showError(result.error)
      return
    }
    success('Settings saved')
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  if (loading) return <PageLoader />

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Manage your gym account.</p>
      </div>
      <div className="space-y-6">
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Account</h2>
          <div className="flex justify-between items-center py-3 border-b border-white/10">
            <span className="text-gray-400 text-sm">Email</span>
            <span className="text-white text-sm">{userEmail}</span>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="mt-4 text-blue-400 text-sm hover:underline">
            Sign out
          </button>
        </div>
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">Gym Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Gym Name</label>
              <input value={gymName} onChange={(e) => setGymName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Gym Slug</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} className={`${inputClass} font-mono`} />
              <p className="text-white/20 text-xs mt-1">Lowercase letters, numbers, hyphens only. Kiosk URL: /kiosk/{slug || 'your-slug'}</p>
            </div>
            <label className="flex items-center justify-between gap-4 py-2">
              <div>
                <p className="text-sm font-medium text-gray-300">Kiosk check-in</p>
                <p className="text-white/30 text-xs">Allow members to self check-in at /kiosk/{slug || 'your-slug'}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={kioskEnabled}
                onClick={() => setKioskEnabled((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition ${kioskEnabled ? 'bg-blue-600' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${kioskEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </label>
            <button onClick={handleSave} disabled={saving || !gymName} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

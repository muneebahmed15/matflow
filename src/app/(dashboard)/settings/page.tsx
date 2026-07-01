'use client'

import { redirectTo } from '@/lib/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ExternalLink, Monitor } from 'lucide-react'

export default function SettingsPage() {
  const [gymName, setGymName] = useState('')
  const [slug, setSlug] = useState('')
  const [gymId, setGymId] = useState<string | null>(null)
  const [kioskEnabled, setKioskEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [kioskOrigin, setKioskOrigin] = useState('')

  useEffect(() => {
    setKioskOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email || '')
      const { data: gym } = await supabase
        .from('gyms')
        .select('id, name, slug, kiosk_enabled')
        .eq('owner_id', user.id)
        .single()
      if (gym) {
        setGymId(gym.id)
        setGymName(gym.name || '')
        setSlug(gym.slug || '')
        setKioskEnabled(Boolean(gym.kiosk_enabled))
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!gymId) return
    setSaving(true)
    const { error } = await supabase
      .from('gyms')
      .update({ name: gymName, slug, kiosk_enabled: kioskEnabled })
      .eq('id', gymId)
    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      alert(error.message)
    }
  }

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  const kioskUrl = slug && kioskOrigin ? `${kioskOrigin}/kiosk/${slug}` : ''

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

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
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              redirectTo('/login')
            }}
            className="mt-4 text-blue-400 text-sm hover:underline"
          >
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
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                className={`${inputClass} font-mono`}
              />
              <p className="text-white/20 text-xs mt-1">Lowercase letters, numbers, hyphens only.</p>
            </div>
            {saved && <p className="text-green-400 text-sm">Settings saved!</p>}
            <button
              onClick={handleSave}
              disabled={saving || !gymName}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Monitor size={18} className="text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Kiosk Check-In</h2>
              <p className="text-white/40 text-sm">Front-desk tablet mode for member self check-in.</p>
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 py-3 border-b border-white/10">
            <span className="text-gray-300 text-sm">Enable kiosk mode</span>
            <input
              type="checkbox"
              checked={kioskEnabled}
              onChange={(e) => setKioskEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-blue-500"
            />
          </label>

          {slug ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-white/40 uppercase tracking-wide">Kiosk URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-blue-300 bg-black/40 border border-white/10 rounded-lg px-3 py-2 truncate">
                  {kioskUrl || `/kiosk/${slug}`}
                </code>
                {kioskUrl && (
                  <Link
                    href={`/kiosk/${slug}`}
                    target="_blank"
                    className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 whitespace-nowrap"
                  >
                    Open <ExternalLink size={14} />
                  </Link>
                )}
              </div>
              <p className="text-white/30 text-xs">Open this URL on a tablet at your front desk after saving.</p>
            </div>
          ) : (
            <p className="text-white/30 text-sm mt-4">Set a gym slug above to generate your kiosk link.</p>
          )}
        </div>
      </div>
    </div>
  )
}

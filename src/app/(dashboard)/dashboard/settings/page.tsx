'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Save } from 'lucide-react'

type Gym = {
  id: string
  name: string
  email: string
  phone: string
  address: string
  logo_url: string
  slug: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [gym, setGym] = useState<Gym | null>(null)
  const [form, setForm] = useState<Partial<Gym>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('gyms')
        .select('*')
        .eq('slug', 'east-coast-mma')
        .single()

      if (data) { setGym(data); setForm(data) }
      setLoading(false)
    }
    init()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    if (!gym) return
    setSaving(true)
    setSuccess(false)

    const { error } = await supabase
      .from('gyms')
      .update({
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        logo_url: form.logo_url,
      })
      .eq('id', gym.id)

    if (!error) setSuccess(true)
    setSaving(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-white/50">Loading...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="text-white/50 hover:text-white transition text-sm">← Dashboard</a>
          <span className="text-white/20">/</span>
          <span className="font-bold">Settings</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold">Gym Settings</h1>
          <p className="text-white/50 mt-1">Manage your gym profile</p>
        </div>

        {success && (
          <div className="mb-6 bg-green-500/20 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-xl">
            Settings saved successfully!
          </div>
        )}

        {/* Gym Logo Preview */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-2xl font-bold overflow-hidden">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span>{form.name?.[0] || 'G'}</span>
            )}
          </div>
          <div>
            <p className="font-bold">{form.name}</p>
            <p className="text-white/40 text-sm">/{form.slug}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="font-bold text-lg mb-2">Gym Profile</h2>

          <div>
            <label className="text-white/40 text-xs mb-1 block">Gym Name</label>
            <input
              name="name"
              value={form.name || ''}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-white/40 text-xs mb-1 block">Email</label>
            <input
              name="email"
              type="email"
              value={form.email || ''}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-white/40 text-xs mb-1 block">Phone</label>
            <input
              name="phone"
              value={form.phone || ''}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-white/40 text-xs mb-1 block">Address</label>
            <input
              name="address"
              value={form.address || ''}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-white/40 text-xs mb-1 block">Logo URL</label>
            <input
              name="logo_url"
              value={form.logo_url || ''}
              onChange={handleChange}
              placeholder="https://your-logo-url.com/logo.png"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
      </div>
    </main>
  )
}
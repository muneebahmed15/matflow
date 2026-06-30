'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffInfo } from '@/lib/permissions'
import { ShieldCheck, Plus, Trash2 } from 'lucide-react'

interface Staff {
  id: string
  user_id: string
  role: string
  full_name: string
  created_at: string
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [gymId, setGymId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('coach')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const load = async () => {
      const info = await getCurrentStaffInfo()
      if (!info.gymId) return
      setGymId(info.gymId)
      const { data } = await supabase.from('staff_roles').select('*').eq('gym_id', info.gymId).order('created_at')
      setStaff(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleInvite = async () => {
    if (!email || !fullName || !gymId) { setError('Please fill in all fields.'); return }
    setSubmitting(true)
    setError('')
    setSuccess('')

    // Create auth user via signup (they'll need to confirm email)
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password: tempPassword,
    })

    if (authErr) {
      setError(authErr.message)
      setSubmitting(false)
      return
    }

    if (authData.user) {
      const { error: roleErr } = await supabase.from('staff_roles').insert({
        user_id: authData.user.id,
        gym_id: gymId,
        role,
        full_name: fullName,
      })
      if (roleErr) {
        setError(roleErr.message)
        setSubmitting(false)
        return
      }
    }

    setSuccess(`Invite sent to ${email}. They'll receive a confirmation email and can set their password.`)
    const { data: updated } = await supabase.from('staff_roles').select('*').eq('gym_id', gymId).order('created_at')
    setStaff(updated || [])
    setEmail('')
    setFullName('')
    setRole('coach')
    setShowForm(false)
    setSubmitting(false)
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this staff member? They will lose access immediately.')) return
    await supabase.from('staff_roles').delete().eq('id', id)
    setStaff(prev => prev.filter(s => s.id !== id))
  }

  const handleRoleChange = async (id: string, newRole: string) => {
    await supabase.from('staff_roles').update({ role: newRole }).eq('id', id)
    setStaff(prev => prev.map(s => s.id === id ? { ...s, role: newRole } : s))
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Staff</h1>
          <p className="text-white/40 text-sm mt-1">Manage admin and coach access to your gym.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          <Plus size={16} /> Invite Staff
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-white">Invite Staff Member</h2>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Coach Josh" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="josh@eastcoastmma.com" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
              <option value="coach" className="bg-gray-900">Coach (limited access)</option>
              <option value="admin" className="bg-gray-900">Admin (full access)</option>
            </select>
            <p className="text-white/20 text-xs mt-1">Coaches can't see billing, plans, subscriptions, or staff settings.</p>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}
          <div className="flex gap-3">
            <button onClick={handleInvite} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition">
              {submitting ? 'Sending invite...' : 'Send Invite'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition">Cancel</button>
          </div>
        </div>
      )}

      {staff.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <ShieldCheck size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No staff added yet</p>
          <p className="text-white/20 text-sm mt-1">Invite coaches to give them limited dashboard access.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((s) => (
            <div key={s.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                  <ShieldCheck size={18} className={s.role === 'admin' ? 'text-blue-400' : 'text-white/40'} />
                </div>
                <div>
                  <p className="font-semibold text-white">{s.full_name}</p>
                  <p className="text-xs text-white/30">Added {new Date(s.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select value={s.role} onChange={(e) => handleRoleChange(s.id, e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white">
                  <option value="coach" className="bg-gray-900">Coach</option>
                  <option value="admin" className="bg-gray-900">Admin</option>
                </select>
                <button onClick={() => handleRemove(s.id)} className="text-white/30 hover:text-red-400 transition">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffInfo } from '@/lib/permissions'
import { ShieldCheck, Plus, Trash2 } from 'lucide-react'
import {
  inviteStaffAction,
  removeStaffAction,
  updateStaffRoleAction,
} from '@/app/(dashboard)/actions'
import type { StaffRole } from '@/lib/auth/staff'
import { useAppUi } from '@/components/ui/AppUiProvider'
import PageLoader from '@/components/PageLoader'

interface Staff {
  id: string
  user_id: string
  role: string
  full_name: string
  created_at: string
}

export default function StaffPage() {
  const { confirm, error: showError } = useAppUi()
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<StaffRole>('coach')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadStaff = async () => {
    const info = await getCurrentStaffInfo()
    if (!info.gymId) return
    const { data } = await supabase
      .from('staff_roles')
      .select('*')
      .eq('gym_id', info.gymId)
      .order('created_at')
    setStaff(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadStaff()
  }, [])

  const handleInvite = async () => {
    if (!email || !fullName) { setError('Please fill in all fields.'); return }
    setSubmitting(true)
    setError('')
    setSuccess('')

    const result = await inviteStaffAction({ email, fullName, role })
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setSuccess(`Invite sent to ${email}. They'll receive an email with next steps.`)
    await loadStaff()
    setEmail('')
    setFullName('')
    setRole('coach')
    setShowForm(false)
  }

  const handleRemove = async (id: string) => {
    const ok = await confirm({
      title: 'Remove staff member',
      message: 'They will lose access immediately.',
      confirmLabel: 'Remove',
      destructive: true,
    })
    if (!ok) return
    const result = await removeStaffAction(id)
    if (!result.ok) {
      showError(result.error)
      return
    }
    setStaff(prev => prev.filter(s => s.id !== id))
  }

  const handleRoleChange = async (id: string, newRole: StaffRole) => {
    const result = await updateStaffRoleAction(id, newRole)
    if (!result.ok) {
      showError(result.error)
      return
    }
    setStaff(prev => prev.map(s => s.id === id ? { ...s, role: newRole } : s))
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  if (loading) return <PageLoader />

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Staff</h1>
          <p className="text-white/40 text-sm mt-1">Invite coaches and admins via secure email invites.</p>
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
            <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className={inputClass}>
              <option value="coach" className="bg-gray-900">Coach (limited access)</option>
              <option value="admin" className="bg-gray-900">Admin (full access)</option>
            </select>
            <p className="text-white/20 text-xs mt-1">Coaches can&apos;t see billing, plans, subscriptions, or staff settings.</p>
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
                <select
                  value={s.role}
                  onChange={(e) => handleRoleChange(s.id, e.target.value as StaffRole)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                >
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

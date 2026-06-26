'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Save, Trash2 } from 'lucide-react'

type Member = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  belt_rank: string
  stripes: number
  status: string
  joined_at: string
  plan_id: string
}

type Plan = {
  id: string
  name: string
  price: number
  interval: string
}

type AttendanceRecord = {
  id: string
  checked_in_at: string
  date: string
  class: { name: string } | null
}

const beltColors: Record<string, string> = {
  white: 'bg-white text-black',
  blue: 'bg-blue-600 text-white',
  purple: 'bg-purple-600 text-white',
  brown: 'bg-amber-800 text-white',
  black: 'bg-black text-white border border-white/20',
}

export default function MemberDetailPage() {
  const router = useRouter()
  const { id } = useParams()
  const [member, setMember] = useState<Member | null>(null)
  const [form, setForm] = useState<Partial<Member>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
const [success, setSuccess] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [checkingOut, setCheckingOut] = useState(false)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('members').select('*').eq('id', id).single()
      if (data) { setMember(data); setForm(data) }
      const { data: plansData } = await supabase
        .from('plans').select('*').eq('is_active', true)
      setPlans(plansData || [])

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('id, checked_in_at, date, class:classes(name)')
        .eq('member_id', id)
        .order('checked_in_at', { ascending: false })
        .limit(20)
      setAttendance((attendanceData as any) || [])
      setLoading(false)
    }
    init()
  }, [id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    const { error } = await supabase
      .from('members').update({ ...form, stripes: Number(form.stripes) }).eq('id', id)
    if (!error) setSuccess(true)
    setSaving(false)
  }

const handleCheckout = async () => {
    if (!form.plan_id) return alert('Please assign a plan first')
    setCheckingOut(true)
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: id, plan_id: form.plan_id }),
    })
    const data = await res.json()
    if (data.url) {
      window.open(data.url, '_blank')
    } else {
      alert('Error: ' + data.error)
    }
  setCheckingOut(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this member?')) return
    setDeleting(true)
    await supabase.from('members').delete().eq('id', id)
    router.push('/dashboard/members')
  }

  if (loading) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-white/50">Loading...</p>
    </main>
  )

  if (!member) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-white/50">Member not found.</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <a href="/dashboard/members" className="text-white/50 hover:text-white transition text-sm">← Members</a>
          <span className="text-white/20">/</span>
          <span className="font-bold">{member.first_name} {member.last_name}</span>
        </div>
        <div className="flex gap-3">
          <button onClick={handleCheckout} disabled={checkingOut} className="flex items-center gap-2 border border-green-500/30 hover:border-green-500 text-green-400 hover:text-green-300 text-sm px-4 py-2 rounded-lg transition">
            {checkingOut ? 'Generating...' : '💳 Send Payment Link'}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-red-300 text-sm px-4 py-2 rounded-lg transition">
            <Trash2 size={15} /> {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold">
            {member.first_name[0]}{member.last_name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">{member.first_name} {member.last_name}</h1>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${beltColors[member.belt_rank] || 'bg-white/10 text-white'}`}>
              {member.belt_rank} belt {member.stripes > 0 ? `— ${'|'.repeat(member.stripes)} stripes` : ''}
            </span>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-green-500/20 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-xl">
            Changes saved successfully!
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="font-bold text-lg mb-2">Member Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/40 text-xs mb-1 block">First name</label>
              <input name="first_name" value={form.first_name || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Last name</label>
              <input name="last_name" value={form.last_name || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
            </div>
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Email</label>
            <input name="email" value={form.email || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Phone</label>
            <input name="phone" value={form.phone || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/40 text-xs mb-1 block">Belt rank</label>
              <select name="belt_rank" value={form.belt_rank || 'white'} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500">
                <option value="white">White</option>
                <option value="blue">Blue</option>
                <option value="purple">Purple</option>
                <option value="brown">Brown</option>
                <option value="black">Black</option>
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Stripes</label>
              <select name="stripes" value={form.stripes ?? 0} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500">
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>
          </div>
         <div>
            <label className="text-white/40 text-xs mb-1 block">Status</label>
            <select name="status" value={form.status || 'active'} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="trial">Trial</option>
            </select>
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Membership Plan</label>
            <select name="plan_id" value={form.plan_id || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500">
              <option value="">No plan assigned</option>
              {plans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — ${plan.price}/{plan.interval}
                </option>
              ))}
            </select>
          {/* Attendance History */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-6">
          <h2 className="font-bold text-lg mb-4">Attendance History</h2>
          {attendance.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No attendance records yet</p>
          ) : (
            <div className="space-y-2">
              {attendance.map(record => (
                <div key={record.id} className="flex items-center justify-between px-4 py-3 bg-white/3 border border-white/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-400 text-xs">✓</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{record.class?.name || 'Open mat'}</p>
                      <p className="text-white/40 text-xs">{new Date(record.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <span className="text-white/40 text-xs">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          )}
        </div></div>
        </div>
      </div>
    </main>
  )
}
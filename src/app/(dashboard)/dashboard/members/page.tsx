'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { UserPlus, X } from 'lucide-react'

type Member = {
  id: string
  first_name: string
  last_name: string
  email: string
  belt_rank: string
  stripes: number
  status: string
  joined_at: string
}

type Plan = {
  id: string
  name: string
  price: number
  interval: string
}

const beltColors: Record<string, string> = {
  white: 'bg-white text-black',
  blue: 'bg-blue-600 text-white',
  purple: 'bg-purple-600 text-white',
  brown: 'bg-amber-800 text-white',
  black: 'bg-black text-white border border-white/20',
}

const defaultForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  belt_rank: 'white',
  stripes: 0,
  plan_id: '',
}

export default function MembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
const [gymId, setGymId] = useState<string>('')
  const [plans, setPlans] = useState<Plan[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: gymData } = await supabase
        .from('gyms').select('id').eq('slug', 'east-coast-mma').single()
      if (gymData) setGymId(gymData.id)
      const { data } = await supabase
        .from('members').select('*').order('joined_at', { ascending: false })
      setMembers(data || [])
      const { data: plansData } = await supabase
        .from('plans').select('*').eq('is_active', true)
      setPlans(plansData || [])
      setLoading(false)
    }
    init()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { data, error } = await supabase
      .from('members')
      .insert([{ ...form, gym_id: gymId, stripes: Number(form.stripes) }])
      .select()
    if (error) { setError(error.message) } 
    else { setMembers([data[0], ...members]); setForm(defaultForm); setShowForm(false) }
    setSaving(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-white/50">Loading members...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="text-white/50 hover:text-white transition text-sm">← Dashboard</a>
          <span className="text-white/20">/</span>
          <span className="font-bold">Members</span>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <UserPlus size={16} /> Add Member
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold">Members</h1>
          <p className="text-white/50 mt-1">{members.length} total members</p>
        </div>

        {showForm && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">New Member</h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="first_name" placeholder="First name" value={form.first_name} onChange={handleChange} required className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-red-500" />
              <input name="last_name" placeholder="Last name" value={form.last_name} onChange={handleChange} required className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-red-500" />
              <input name="email" type="email" placeholder="Email address" value={form.email} onChange={handleChange} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-red-500" />
              <input name="phone" placeholder="Phone number" value={form.phone} onChange={handleChange} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-red-500" />
              <select name="belt_rank" value={form.belt_rank} onChange={handleChange} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500">
                <option value="white">White Belt</option>
                <option value="blue">Blue Belt</option>
                <option value="purple">Purple Belt</option>
                <option value="brown">Brown Belt</option>
                <option value="black">Black Belt</option>
              </select>
            <select name="stripes" value={form.stripes} onChange={handleChange} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500">
                <option value={0}>0 Stripes</option>
                <option value={1}>1 Stripe</option>
                <option value={2}>2 Stripes</option>
                <option value={3}>3 Stripes</option>
                <option value={4}>4 Stripes</option>
              </select>
              <select name="plan_id" value={form.plan_id} onChange={handleChange} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 col-span-2">
                <option value="">No plan assigned</option>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — ${plan.price}/{plan.interval}
                  </option>
                ))}
              </select>
              {error && <p className="text-red-400 text-sm col-span-2">{error}</p>}
              <div className="col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white transition">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold transition">{saving ? 'Saving...' : 'Add Member'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-left">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Belt</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-6 py-4 font-medium">
                    <a href={`/dashboard/members/${m.id}`} className="hover:text-red-400 transition">
                      {m.first_name} {m.last_name}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-white/50">{m.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${beltColors[m.belt_rank] || 'bg-white/10 text-white'}`}>
                      {m.belt_rank} {m.stripes > 0 ? '|'.repeat(m.stripes) : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${m.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/50">{new Date(m.joined_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-white/30">No members yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, Calendar, Award, TrendingUp, UserCheck, DollarSign } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalMembers: 0,
    classesToday: 0,
    checkInsToday: 0,
    activePlans: 0,
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchStats()
      setLoading(false)
    }
    init()
  }, [router])

  async function fetchStats() {
    const today = new Date().toISOString().split('T')[0]
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })

    const [
      { count: totalMembers },
      { count: classesToday },
      { count: checkInsToday },
      { count: activePlans },
    ] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('classes').select('*', { count: 'exact', head: true }).eq('day_of_week', dayName).eq('is_active', true),
      supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today),
      supabase.from('plans').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ])

    setStats({
      totalMembers: totalMembers || 0,
      classesToday: classesToday || 0,
      checkInsToday: checkInsToday || 0,
      activePlans: activePlans || 0,
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-white/50">Loading...</p>
    </main>
  )

  const statCards = [
    { icon: Users, label: 'Active Members', value: stats.totalMembers, color: 'text-red-500', bg: 'bg-red-500/10' },
    { icon: UserCheck, label: 'Check-ins Today', value: stats.checkInsToday, color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: Calendar, label: 'Classes Today', value: stats.classesToday, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: TrendingUp, label: 'Active Plans', value: stats.activePlans, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  ]

  const links = [
    { title: 'Members', desc: 'View and manage all students', href: '/dashboard/members' },
    { title: 'Attendance', desc: 'Check in members to classes', href: '/dashboard/attendance' },
    { title: 'Plans', desc: 'Create and manage membership plans', href: '/dashboard/plans' },
    { title: 'Classes', desc: 'Schedule and track classes', href: '/dashboard/classes' },
    { title: 'Settings', desc: 'Gym profile and billing', href: '/dashboard/settings' },
  ]

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="text-xl font-bold">MatFlow</span>
        <div className="flex items-center gap-4">
          <span className="text-white/50 text-sm">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm text-white/50 hover:text-white transition">
            Log out
          </button>
        </div>
      </nav>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold">Dashboard</h1>
          <p className="text-white/50 mt-1">East Coast MMA — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {statCards.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={color} size={20} />
              </div>
              <p className="text-3xl font-extrabold">{value}</p>
              <p className="text-white/50 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {links.map(({ title, desc, href }) => (
            <a key={title} href={href} className="bg-white/5 border border-white/10 hover:border-red-500/50 rounded-2xl p-6 transition group">
              <h3 className="font-bold text-lg group-hover:text-red-400 transition">{title}</h3>
              <p className="text-white/50 text-sm mt-1">{desc}</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
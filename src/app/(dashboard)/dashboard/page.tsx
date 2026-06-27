'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Users, Calendar, UserCheck, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
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
      supabase
  .from('attendance')
  .select('*', { count: 'exact', head: true })
  .gte('checked_in_at', `${today}T00:00:00`)
  .lte('checked_in_at', `${today}T23:59:59`),
      supabase.from('plans').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ])
    setStats({
      totalMembers: totalMembers || 0,
      classesToday: classesToday || 0,
      checkInsToday: checkInsToday || 0,
      activePlans: activePlans || 0,
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-white/50">Loading...</p>
    </div>
  )

  const statCards = [
    { icon: Users, label: 'Active Members', value: stats.totalMembers, color: 'text-red-500', bg: 'bg-red-500/10' },
    { icon: UserCheck, label: 'Check-ins Today', value: stats.checkInsToday, color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: Calendar, label: 'Classes Today', value: stats.classesToday, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: TrendingUp, label: 'Active Plans', value: stats.activePlans, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">Dashboard</h1>
        <p className="text-white/50 mt-1">East Coast MMA</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-1">Quick Actions</h2>
          <p className="text-white/40 text-sm mb-4">Common tasks at a glance</p>
          <div className="space-y-2">
            <a href="/dashboard/attendance" className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition text-sm">
              <UserCheck size={16} className="text-green-400" /> Check in a member
            </a>
            <a href="/dashboard/members" className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition text-sm">
              <Users size={16} className="text-blue-400" /> Add a new member
            </a>
            <a href="/dashboard/plans" className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition text-sm">
              <TrendingUp size={16} className="text-yellow-400" /> Create a membership plan
            </a>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-1">Today</h2>
          <p className="text-white/40 text-sm mb-4">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Check-ins</span>
              <span className="font-bold">{stats.checkInsToday}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Classes scheduled</span>
              <span className="font-bold">{stats.classesToday}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Active members</span>
              <span className="font-bold">{stats.totalMembers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Active plans</span>
              <span className="font-bold">{stats.activePlans}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
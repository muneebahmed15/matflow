'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffInfo } from '@/lib/permissions'
import { Users, UserCheck, CreditCard, FileText } from 'lucide-react'
import { StatsSkeleton } from '@/components/LoadingSkeleton'

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalMembers: 0, activeMembers: 0, todayCheckIns: 0, activeSubscriptions: 0, activeWaivers: 0 })
  const [loading, setLoading] = useState(true)
  const [gymName, setGymName] = useState('East Coast MMA')

  useEffect(() => {
    const load = async () => {
      const info = await getCurrentStaffInfo()
      if (!info.gymId) return
      const { data: gym } = await supabase.from('gyms').select('id, name').eq('id', info.gymId).single()
      if (!gym) return
      if (gym.name) setGymName(gym.name)
      const today = new Date().toISOString().split('T')[0]
      const [
        { count: totalMembers },
        { count: activeMembers },
        { count: todayCheckIns },
        { count: activeSubscriptions },
        { count: activeWaivers },
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('gym_id', gym.id),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('gym_id', gym.id).eq('status', 'active'),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('gym_id', gym.id).gte('checked_in_at', `${today}T00:00:00`).lte('checked_in_at', `${today}T23:59:59`),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('gym_id', gym.id).eq('status', 'active'),
        supabase.from('waivers').select('*', { count: 'exact', head: true }).eq('gym_id', gym.id).eq('is_active', true),
      ])
      setStats({ totalMembers: totalMembers ?? 0, activeMembers: activeMembers ?? 0, todayCheckIns: todayCheckIns ?? 0, activeSubscriptions: activeSubscriptions ?? 0, activeWaivers: activeWaivers ?? 0 })
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: 'Total Members', value: stats.totalMembers, sub: `${stats.activeMembers} active`, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: "Today's Check-Ins", value: stats.todayCheckIns, sub: 'checked in today', icon: UserCheck, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions, sub: 'recurring billing', icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'Active Waivers', value: stats.activeWaivers, sub: 'available to sign', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  ]

  if (loading) return (
    <div className="p-8">
      <StatsSkeleton />
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">{gymName}</h1>
        <p className="text-white/40 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, sub, icon: Icon, color, bg, border }) => (
          <div key={label} className={`${bg} border ${border} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider">{label}</p>
              <Icon size={16} className={color} />
            </div>
            <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
            <p className="text-white/30 text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { href: '/attendance/check-in', icon: UserCheck, iconColor: 'text-blue-400', bg: 'bg-blue-600/20', title: 'Check In a Member', sub: 'One-tap attendance tracking' },
          { href: '/members/new', icon: Users, iconColor: 'text-blue-400', bg: 'bg-blue-600/20', title: 'Add New Member', sub: 'Register a new student' },
          { href: '/waivers', icon: FileText, iconColor: 'text-purple-400', bg: 'bg-purple-600/20', title: 'Manage Waivers', sub: 'Digital e-signature waivers' },
          { href: '/plans', icon: CreditCard, iconColor: 'text-green-400', bg: 'bg-green-600/20', title: 'Membership Plans', sub: 'Create and manage billing plans' },
        ].map(({ href, icon: Icon, iconColor, bg, title, sub }) => (
          <a key={href} href={href} className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-5 transition">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon size={18} className={iconColor} />
              </div>
              <div>
                <p className="font-semibold text-white">{title}</p>
                <p className="text-white/40 text-sm">{sub}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, Calendar, Award, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
      setLoading(false)
    }
    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/50">Loading...</p>
      </main>
    )
  }

  const stats = [
    { icon: Users, label: 'Total Members', value: '1', color: 'text-red-500' },
    { icon: Calendar, label: 'Classes Today', value: '0', color: 'text-blue-500' },
    { icon: Award, label: 'Promotions', value: '0', color: 'text-yellow-500' },
    { icon: TrendingUp, label: 'Active Trials', value: '0', color: 'text-green-500' },
  ]

  const links = [
    { title: 'Members', desc: 'View and manage all students', href: '/dashboard/members' },
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
          <p className="text-white/50 mt-1">East Coast MMA — Admin View</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <Icon className={`${color} mb-3`} size={24} />
              <p className="text-2xl font-bold">{value}</p>
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

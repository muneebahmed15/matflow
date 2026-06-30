'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffInfo, canAccessRoute, type StaffRole } from '@/lib/permissions'
import { LayoutDashboard, Users, UserCheck, Calendar, CreditCard, Settings, LogOut, Menu, X, FileText, Dumbbell, Award, UserPlus, ShieldCheck } from 'lucide-react'
import Logo from '@/components/Logo'
import { AppUiProvider } from '@/components/ui/AppUiProvider'
import PageLoader from '@/components/PageLoader'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: false },
  { label: 'Members', href: '/members', icon: Users, adminOnly: false },
  { label: 'Leads', href: '/leads', icon: UserPlus, adminOnly: true },
  { label: 'Classes', href: '/classes', icon: Dumbbell, adminOnly: false },
  { label: 'Check-In', href: '/attendance/check-in', icon: UserCheck, adminOnly: false },
  { label: 'Attendance Log', href: '/attendance/log', icon: Calendar, adminOnly: false },
  { label: 'Belts', href: '/belts', icon: Award, adminOnly: false },
  { label: 'Waivers', href: '/waivers', icon: FileText, adminOnly: false },
  { label: 'Plans', href: '/plans', icon: CreditCard, adminOnly: true },
  { label: 'Subscriptions', href: '/subscriptions', icon: CreditCard, adminOnly: true },
  { label: 'Staff', href: '/staff', icon: ShieldCheck, adminOnly: true },
  { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
]

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [gymName, setGymName] = useState('My Gym')
  const [role, setRole] = useState<StaffRole>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      let staffInfo = await getCurrentStaffInfo()
      if (!staffInfo.role) {
        const res = await fetch('/api/gym/onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        if (!res.ok) { router.push('/login'); return }
        staffInfo = await getCurrentStaffInfo()
        if (!staffInfo.role) { router.push('/login'); return }
      }
      setRole(staffInfo.role)

      if (staffInfo.gymId) {
        const { data: gym } = await supabase.from('gyms').select('name').eq('id', staffInfo.gymId).single()
        if (gym?.name) setGymName(gym.name)
      }

      if (!canAccessRoute(staffInfo.role, pathname)) {
        router.push('/dashboard')
        return
      }

      setChecked(true)
    }
    getUser()
  }, [router, pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const visibleNavItems = navItems.filter(item => !item.adminOnly || role === 'admin')

  if (!checked) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <PageLoader />
      </div>
    )
  }

  return (
    <AppUiProvider>
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#111111] border-r border-[#1F1F1F] z-30 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="px-6 py-5 border-b border-[#1F1F1F]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo size={28} />
              <span className="font-bold text-lg tracking-tight">MatsFlow</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/40 hover:text-white"><X size={18} /></button>
          </div>
          <p className="text-gray-500 text-xs mt-2 font-medium truncate">{gymName}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            return (
              <a key={href} href={href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-blue-600/15 text-white border border-blue-600/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                <Icon size={18} className={active ? 'text-blue-500' : ''} />
                {label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </a>
            )
          })}
        </nav>
        <div className="px-3 py-4 border-t border-[#1F1F1F]">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-xs font-bold text-blue-400">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.email}</p>
              <p className="text-gray-500 text-xs capitalize">{role}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-500 hover:text-white transition"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-4 px-4 py-3 border-b border-[#1F1F1F] bg-[#111111]">
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white"><Menu size={20} /></button>
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-bold">MatsFlow</span>
          </div>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
    </AppUiProvider>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LayoutDashboard, Users, UserCheck, Calendar, CreditCard, Settings, LogOut, Menu, X } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Members', href: '/dashboard/members', icon: Users },
  { label: 'Attendance', href: '/dashboard/attendance', icon: UserCheck },
  { label: 'Classes', href: '/dashboard/classes', icon: Calendar },
  { label: 'Plans', href: '/dashboard/plans', icon: CreditCard },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
    }
    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#111111] border-r border-[#1F1F1F] z-30 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="px-6 py-5 border-b border-[#1F1F1F]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-black">M</span>
              </div>
              <span className="font-bold text-lg tracking-tight">MatFlow</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/40 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-2 font-medium">East Coast MMA</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            return (
              <a key={href} href={href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-red-600/15 text-white border border-red-600/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                <Icon size={18} className={active ? 'text-red-500' : ''} />
                {label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />}
              </a>
            )
          })}
        </nav>
        <div className="px-3 py-4 border-t border-[#1F1F1F]">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center text-xs font-bold text-red-400">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.email}</p>
              <p className="text-gray-500 text-xs">Admin</p>
            </div>
            <button onClick={handleLogout} className="text-gray-500 hover:text-white transition">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-4 px-4 py-3 border-b border-[#1F1F1F] bg-[#111111]">
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-600 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-black">M</span>
            </div>
            <span className="font-bold">MatFlow</span>
          </div>
        </div>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

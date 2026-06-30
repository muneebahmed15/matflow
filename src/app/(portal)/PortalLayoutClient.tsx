'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { LogOut } from 'lucide-react'
import Logo from '@/components/Logo'
import { AppUiProvider } from '@/components/ui/AppUiProvider'
import PageLoader from '@/components/PageLoader'

const PUBLIC_PORTAL_ROUTES = ['/portal/login', '/portal/signup']

export default function PortalLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user && !PUBLIC_PORTAL_ROUTES.includes(pathname)) {
        router.push('/portal/login')
        return
      }
      setUser(user)
      setLoading(false)
    }
    check()
  }, [router, pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/portal/login')
  }

  if (PUBLIC_PORTAL_ROUTES.includes(pathname)) {
    return <AppUiProvider>{children}</AppUiProvider>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <PageLoader />
      </div>
    )
  }

  return (
    <AppUiProvider>
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-white/10 bg-[#111] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-bold text-lg">MatsFlow</span>
          <span className="text-white/20 text-sm ml-2">Member Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-white/40 text-sm hidden sm:block">{user?.email}</p>
          <button onClick={handleLogout} className="text-white/40 hover:text-white transition">
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-6">
        {children}
      </main>
    </div>
    </AppUiProvider>
  )
}

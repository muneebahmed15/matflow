'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { LogOut, Users } from 'lucide-react'
import Logo from '@/components/Logo'
import { usePortalMember } from '@/lib/portal-member-context'

const PORTAL_PUBLIC_ROUTES = ['/portal/login', '/portal/signup'] as const

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { loading: memberLoading, familyMembers, activeMember, setActiveMemberId } = usePortalMember()
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [gymBranding, setGymBranding] = useState<{
    name: string;
    logo_url: string | null;
    white_label_enabled: boolean;
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user && !PORTAL_PUBLIC_ROUTES.includes(pathname as typeof PORTAL_PUBLIC_ROUTES[number])) {
        router.push('/portal/login')
        return
      }
      setUser(user)
      if (user?.email) {
        const { data: member } = await supabase
          .from('members')
          .select('gym_id')
          .eq('email', user.email)
          .maybeSingle()
        if (member?.gym_id) {
          const { data: gym } = await supabase
            .from('gyms')
            .select('name, logo_url, white_label_enabled')
            .eq('id', member.gym_id)
            .maybeSingle()
          if (gym) setGymBranding(gym)
        }
      }
      setLoading(false)
    }
    check()
  }, [router, pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/portal/login')
  }

  if (PORTAL_PUBLIC_ROUTES.includes(pathname as typeof PORTAL_PUBLIC_ROUTES[number])) {
    return <>{children}</>
  }

  if (loading || memberLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-white/40">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-white/10 bg-[#111] px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          {gymBranding?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gymBranding.logo_url} alt="" className="h-7 w-7 rounded-lg object-cover shrink-0" />
          ) : gymBranding?.white_label_enabled ? null : (
            <Logo size={28} />
          )}
          <span className="font-bold text-lg truncate">{gymBranding?.name ?? 'MatFlow'}</span>
          {!gymBranding?.white_label_enabled && (
            <span className="text-white/20 text-sm ml-2 hidden sm:inline">Member Portal</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {familyMembers.length > 1 && activeMember && (
            <select
              value={activeMember.id}
              onChange={(e) => setActiveMemberId(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg text-xs px-2 py-1.5 text-white/80 max-w-[140px]"
              aria-label="Switch family member"
            >
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name}
                </option>
              ))}
            </select>
          )}
          {familyMembers.length > 1 && (
            <Link href="/portal/family" className="text-white/40 hover:text-white" title="Family">
              <Users size={16} />
            </Link>
          )}
          <p className="text-white/40 text-sm hidden md:block">{user?.email}</p>
          <button onClick={handleLogout} className="text-white/40 hover:text-white transition">
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-6">
        {children}
      </main>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserCheck, FileText, CreditCard, User, Award, Package, Calendar } from 'lucide-react'
import Link from 'next/link'
import { usePortalMember } from '@/lib/portal-member-context'
import { countUnsignedActiveWaivers } from '@/lib/waivers'

export default function PortalPage() {
  const { activeMember, loading: memberLoading } = usePortalMember()
  const [loading, setLoading] = useState(true)
  const [attendanceCount, setAttendanceCount] = useState(0)
  const [waiverCount, setWaiverCount] = useState(0)
  const [unsignedWaivers, setUnsignedWaivers] = useState(0)
  const [todayClasses, setTodayClasses] = useState<{ name: string; start_time: string | null }[]>([])

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const beltColors: Record<string, string> = {
    white: 'bg-white/10 text-white', yellow: 'bg-yellow-500/20 text-yellow-400',
    orange: 'bg-orange-500/20 text-orange-400', green: 'bg-green-500/20 text-green-400',
    blue: 'bg-blue-500/20 text-blue-400', purple: 'bg-purple-500/20 text-purple-400',
    brown: 'bg-amber-700/20 text-amber-500', black: 'bg-white/5 text-white/60',
  }

  useEffect(() => {
    if (!activeMember) return
    const load = async () => {
      const today = DAYS[new Date().getDay()]
      const [{ count: att }, { count: wav }, { data: activeWaivers }, { data: signatures }, { data: todayCls }] = await Promise.all([
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('member_id', activeMember.id),
        supabase.from('waiver_signatures').select('*', { count: 'exact', head: true }).eq('member_id', activeMember.id),
        supabase.from('waivers').select('id').eq('gym_id', activeMember.gym_id).eq('is_active', true),
        supabase.from('waiver_signatures').select('waiver_id, expires_at, signed_at').eq('member_id', activeMember.id),
        supabase.from('classes').select('name, start_time').eq('gym_id', activeMember.gym_id).eq('is_active', true).eq('day_of_week', today),
      ])
      setAttendanceCount(att ?? 0)
      setWaiverCount(wav ?? 0)
      setTodayClasses(todayCls ?? [])

      const missing = countUnsignedActiveWaivers(activeWaivers ?? [], signatures ?? [])
      setUnsignedWaivers(missing)
      setLoading(false)
    }
    void load()
  }, [activeMember])

  if (memberLoading || loading || !activeMember) {
    return <div className="text-gray-400 py-12 text-center">Loading...</div>
  }

  const member = activeMember

  return (
    <div className="space-y-6">
      {member.status === 'past_due' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-yellow-400 font-medium text-sm">Payment required</p>
            <p className="text-yellow-400/70 text-xs mt-1">Update your payment method to restore full access.</p>
          </div>
          <Link
            href="/portal/subscription"
            className="text-xs font-semibold bg-yellow-500/20 text-yellow-300 px-3 py-1.5 rounded-lg shrink-0 hover:bg-yellow-500/30"
          >
            Fix billing
          </Link>
        </div>
      )}

      {unsignedWaivers > 0 && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-purple-300 font-medium text-sm">Waiver signature required</p>
            <p className="text-purple-300/70 text-xs mt-1">
              {unsignedWaivers} active waiver{unsignedWaivers === 1 ? '' : 's'} need your signature.
            </p>
          </div>
          <Link href="/portal/waivers" className="text-xs font-semibold bg-purple-500/20 text-purple-200 px-3 py-1.5 rounded-lg shrink-0">
            Sign now
          </Link>
        </div>
      )}

      {todayClasses.length > 0 && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
          <p className="text-white/50 text-xs font-medium flex items-center gap-2 mb-2">
            <Calendar size={14} /> Today&apos;s classes
          </p>
          <ul className="text-sm text-white/70 space-y-1">
            {todayClasses.map((c, i) => (
              <li key={i}>{c.name}{c.start_time ? ` · ${c.start_time}` : ''}</li>
            ))}
          </ul>
          <Link href="/portal/classes" className="text-xs text-blue-400 hover:underline mt-2 inline-block">
            Full schedule →
          </Link>
        </div>
      )}

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center text-xl font-bold text-blue-400">
            {member.first_name[0]}{member.last_name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{member.first_name} {member.last_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${beltColors[member.belt_rank] || 'bg-white/5 text-white/40'}`}>
                {member.belt_rank} belt{(member.stripe_count ?? 0) > 0 ? ` · ${member.stripe_count} stripe${member.stripe_count === 1 ? '' : 's'}` : ''}
              </span>
              {member.status === 'past_due' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  payment due
                </span>
              ) : (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${member.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'}`}>
                  {member.status}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#111] border border-white/10 rounded-2xl p-5">
          <UserCheck size={18} className="text-green-400 mb-2" />
          <p className="text-2xl font-bold text-white">{attendanceCount}</p>
          <p className="text-white/30 text-xs">Total Check-Ins</p>
        </div>
        <div className="bg-[#111] border border-white/10 rounded-2xl p-5">
          <FileText size={18} className="text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-white">{waiverCount}</p>
          <p className="text-white/30 text-xs">Waivers Signed</p>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { href: '/portal/attendance', icon: UserCheck, color: 'text-green-400', bg: 'bg-green-500/10', title: 'My Attendance', sub: 'View your check-in history' },
          { href: '/portal/classes', icon: Calendar, color: 'text-cyan-400', bg: 'bg-cyan-500/10', title: 'Class Schedule', sub: 'Browse schedule and join waitlists' },
          { href: '/portal/waivers', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10', title: 'My Waivers', sub: 'View and sign waivers' },
          { href: '/portal/subscription', icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10', title: 'My Subscription', sub: 'View billing and membership' },
          { href: '/portal/belt', icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/10', title: 'Belt Progress', sub: 'Rank, stripes, and promotion history' },
          { href: '/portal/profile', icon: User, color: 'text-white/60', bg: 'bg-white/10', title: 'My Profile', sub: 'Update contact information' },
          { href: '/portal/orders', icon: Package, color: 'text-pink-400', bg: 'bg-pink-500/10', title: 'My Orders', sub: 'Shop purchase history' },
        ].map(({ href, icon: Icon, color, bg, title, sub }) => (
          <a key={href} href={href} className="flex items-center gap-4 bg-[#111] border border-white/10 hover:border-white/20 rounded-2xl p-4 transition">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="font-semibold text-white">{title}</p>
              <p className="text-white/30 text-xs">{sub}</p>
            </div>
            <span className="ml-auto text-white/20">→</span>
          </a>
        ))}
      </div>
    </div>
  )
}

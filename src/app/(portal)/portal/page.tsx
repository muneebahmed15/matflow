'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserCheck, FileText, CreditCard, Award } from 'lucide-react'

interface MemberData {
  id: string
  first_name: string
  last_name: string
  belt_rank: string
  status: string
  email: string
}

export default function PortalPage() {
  const [member, setMember] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [attendanceCount, setAttendanceCount] = useState(0)
  const [waiverCount, setWaiverCount] = useState(0)

  const beltColors: Record<string, string> = {
    white: 'bg-white/10 text-white', yellow: 'bg-yellow-500/20 text-yellow-400',
    orange: 'bg-orange-500/20 text-orange-400', green: 'bg-green-500/20 text-green-400',
    blue: 'bg-blue-500/20 text-blue-400', purple: 'bg-purple-500/20 text-purple-400',
    brown: 'bg-amber-700/20 text-amber-500', black: 'bg-white/5 text-white/60',
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: memberData } = await supabase.from('members').select('*').eq('email', user.email).single()
      if (memberData) {
        setMember(memberData)
        const [{ count: att }, { count: wav }] = await Promise.all([
          supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('member_id', memberData.id),
          supabase.from('waiver_signatures').select('*', { count: 'exact', head: true }).eq('member_id', memberData.id),
        ])
        setAttendanceCount(att ?? 0)
        setWaiverCount(wav ?? 0)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>
  if (!member) return (
    <div className="text-center py-12">
      <p className="text-white/40">No member profile found for your account.</p>
      <p className="text-white/20 text-sm mt-2">Contact your gym admin to get set up.</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center text-xl font-bold text-blue-400">
            {member.first_name[0]}{member.last_name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{member.first_name} {member.last_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${beltColors[member.belt_rank] || 'bg-white/5 text-white/40'}`}>
                {member.belt_rank} belt
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${member.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'}`}>
                {member.status}
              </span>
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
          { href: '/portal/waivers', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10', title: 'My Waivers', sub: 'View and sign waivers' },
          { href: '/portal/subscription', icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10', title: 'My Subscription', sub: 'View billing and membership' },
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

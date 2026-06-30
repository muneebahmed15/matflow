'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserCheck } from 'lucide-react'

interface AttendanceRecord {
  id: string
  checked_in_at: string
}

export default function PortalAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [memberId, setMemberId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: member } = await supabase.from('members').select('id').eq('email', user.email).single()
      if (!member) return
      setMemberId(member.id)
      const { data } = await supabase.from('attendance').select('id, checked_in_at').eq('member_id', member.id).order('checked_in_at', { ascending: false })
      setRecords(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <a href="/portal" className="text-sm text-gray-400 hover:text-white">← Back</a>
        <h1 className="text-2xl font-bold mt-2">My Attendance</h1>
        <p className="text-white/40 text-sm">{records.length} total check-ins</p>
      </div>

      {records.length === 0 ? (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-12 text-center">
          <UserCheck size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/30">No check-ins yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-[#111] border border-white/10 rounded-xl px-4 py-3">
              <div>
                <p className="text-white font-medium">
                  {new Date(r.checked_in_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <span className="text-white/30 text-xs">
                {new Date(r.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

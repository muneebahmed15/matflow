'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserCheck, Download } from 'lucide-react'
import Link from 'next/link'
import { countThisMonth, computeStreak } from '@/lib/attendance-stats'
import { usePortalMember } from '@/lib/portal-member-context'

interface AttendanceRecord {
  id: string
  checked_in_at: string
}

export default function PortalAttendancePage() {
  const { activeMember, loading: memberLoading } = usePortalMember()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeMember) return
    const load = async () => {
      const { data } = await supabase
        .from('attendance')
        .select('id, checked_in_at')
        .eq('member_id', activeMember.id)
        .order('checked_in_at', { ascending: false })
      setRecords(data || [])
      setLoading(false)
    }
    void load()
  }, [activeMember])

  const dates = records.map((r) => r.checked_in_at)
  const monthCount = countThisMonth(dates)
  const streak = computeStreak(dates)

  const exportCsv = () => {
    const header = 'date,time\n'
    const rows = records
      .map((r) => {
        const d = new Date(r.checked_in_at)
        return `${d.toISOString().split('T')[0]},${d.toLocaleTimeString()}`
      })
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'attendance.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (memberLoading || loading || !activeMember) {
    return <div className="text-gray-400 py-12 text-center">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/portal" className="text-sm text-gray-400 hover:text-white">← Back</Link>
          <h1 className="text-2xl font-bold mt-2">My Attendance</h1>
          <p className="text-white/40 text-sm">
            {activeMember.first_name} {activeMember.last_name} · {records.length} total check-ins
          </p>
        </div>
        {records.length > 0 && (
          <button onClick={exportCsv} className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
          <p className="text-2xl font-bold text-white">{monthCount}</p>
          <p className="text-white/30 text-xs">This month</p>
        </div>
        <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
          <p className="text-2xl font-bold text-green-400">{streak}</p>
          <p className="text-white/30 text-xs">Day streak</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-12 text-center">
          <UserCheck size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/30 mb-4">No check-ins yet.</p>
          <Link
            href="/portal/classes"
            className="inline-block text-sm font-medium text-blue-400 hover:underline"
          >
            Browse classes to get started →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-[#111] border border-white/10 rounded-xl px-4 py-3">
              <p className="text-white font-medium">
                {new Date(r.checked_in_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
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

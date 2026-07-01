import { requireStaffSessionForPage } from '@/lib/auth/staff'
import { listAttendance } from '@/services/attendance'
import AttendanceDatePicker from '@/components/attendance/AttendanceDatePicker'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

type Props = {
  searchParams: Promise<{ date?: string }>
}

export default async function AttendanceLogPage({ searchParams }: Props) {
  const auth = await requireStaffSessionForPage()

  const { date: requestedDate } = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const date = requestedDate && DATE_ONLY.test(requestedDate) ? requestedDate : today
  const records = await listAttendance(auth.gymId, { date })

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1">Attendance Log</h1>
      <p className="text-white/50 text-sm mb-6">View check-ins by date.</p>

      <AttendanceDatePicker date={date} />

      <p className="text-sm text-white/40 mb-4">
        {records.length} check-in{records.length !== 1 ? 's' : ''} on {date}
      </p>

      {records.length === 0 && (
        <p className="text-white/30 text-sm text-center py-12">No check-ins for this date.</p>
      )}

      <div className="space-y-2">
        {records.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3"
          >
            <div>
              <p className="text-white font-semibold">
                {r.members?.first_name} {r.members?.last_name}
              </p>
              <p className="text-white/40 text-xs">{r.members?.email}</p>
            </div>
            <span className="text-white/40 text-xs">
              {new Date(r.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'

type Props = {
  date: string
}

export default function AttendanceDatePicker({ date }: Props) {
  const router = useRouter()

  return (
    <input
      type="date"
      value={date}
      onChange={(e) => router.push(`/attendance/log?date=${e.target.value}`)}
      className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}

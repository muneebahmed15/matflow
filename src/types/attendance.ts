export type Attendance = {
  id: string
  gym_id: string
  member_id: string
  checked_in_at: string
  checked_in_by: string | null
  notes: string | null
}

export type AttendanceWithMember = Attendance & {
  members: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string | null
  }
}
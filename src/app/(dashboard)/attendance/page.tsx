'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Member {
  id: string
  first_name: string
  last_name: string
}

interface Class {
  id: string
  name: string
}

export default function AttendancePage() {
  const [members, setMembers] = useState<Member[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [notes, setNotes] = useState('')
  const [gymId, setGymId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: gymData } = await supabase
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!gymData) return
      setGymId(gymData.id)

      const { data: memberData } = await supabase
        .from('members')
        .select('id, first_name, last_name')
        .eq('gym_id', gymData.id)
        .order('first_name')

      if (memberData) setMembers(memberData)

      const { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('gym_id', gymData.id)
        .eq('is_active', true)
        .order('name')

      if (classData) setClasses(classData)
    }

    fetchData()
  }, [])

  const handleSubmit = async () => {
    if (!selectedMember || !gymId) return
    setLoading(true)

    const { error } = await supabase.from('attendance').insert({
      gym_id: gymId,
      member_id: selectedMember,
      class_id: selectedClass || null,
      notes,
      checked_in_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    })

    setLoading(false)
    if (!error) {
      setSuccess(true)
      setSelectedMember('')
      setSelectedClass('')
      setNotes('')
      setTimeout(() => setSuccess(false), 3000)
    } else {
      alert(error.message)
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Mark Attendance</h1>

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
          ✅ Attendance marked successfully!
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a member...</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Class (optional)</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Open mat / No class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this session..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !selectedMember}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? 'Saving...' : 'Mark Attendance'}
        </button>
      </div>
    </div>
  )
}
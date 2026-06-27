'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'

type Class = {
  id: string
  name: string
  instructor: string
  day_of_week: string
  start_time: string
  duration_minutes: number
  capacity: number
  is_active: boolean
}

type Member = {
  id: string
  first_name: string
  last_name: string
  email: string
}

type Enrollment = {
  id: string
  member_id: string
  members: Member
}

const defaultForm = {
  name: '',
  instructor: '',
  day_of_week: 'Monday',
  start_time: '09:00',
  duration_minutes: 60,
  capacity: 20,
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [gymId, setGymId] = useState<string>('')

  // Expanded card state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [enrollLoading, setEnrollLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: gymData } = await supabase
        .from('gyms').select('id').eq('slug', 'east-coast-mma').single()
      if (gymData) setGymId(gymData.id)
      fetchClasses()
    }
    init()
  }, [])

  async function fetchClasses() {
    setLoading(true)
    const { data } = await supabase
      .from('classes')
      .select('*')
      .order('day_of_week', { ascending: true })
    setClasses(data || [])
    setLoading(false)
  }

  async function handleExpand(classId: string) {
    if (expandedId === classId) {
      setExpandedId(null)
      return
    }
    setExpandedId(classId)
    setEnrollLoading(true)
    setSelectedMember('')

    const [{ data: enrollData }, { data: memberData }] = await Promise.all([
      supabase
        .from('enrollments')
        .select('id, member_id, members(id, first_name, last_name, email)')
        .eq('class_id', classId),
      supabase
        .from('members')
        .select('id, first_name, last_name, email')
        .eq('gym_id', gymId),
    ])

    setEnrollments((enrollData as unknown as Enrollment[]) || [])
    setAllMembers(memberData || [])
    setEnrollLoading(false)
  }

  async function handleEnroll(classId: string) {
    if (!selectedMember) return
    await supabase.from('enrollments').insert({
      class_id: classId,
      member_id: selectedMember,
      gym_id: gymId,
    })
    setSelectedMember('')
    handleExpand(classId)
  }

  async function handleUnenroll(enrollmentId: string, classId: string) {
    await supabase.from('enrollments').delete().eq('id', enrollmentId)
    handleExpand(classId)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!form.name) return
    setSaving(true)
    const { error } = await supabase.from('classes').insert({
      ...form,
      gym_id: gymId,
      duration_minutes: Number(form.duration_minutes),
      capacity: Number(form.capacity),
    })
    if (!error) {
      setForm(defaultForm)
      setShowForm(false)
      fetchClasses()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this class?')) return
    await supabase.from('classes').delete().eq('id', id)
    fetchClasses()
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="text-white/50 hover:text-white transition text-sm">← Dashboard</a>
          <span className="text-white/20">/</span>
          <span className="font-bold">Classes</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          {showForm ? 'Cancel' : '+ New Class'}
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold">Classes</h1>
          <p className="text-white/50 mt-1">{classes.length} total classes</p>
        </div>

        {/* Add Class Form */}
        {showForm && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">New Class</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="name"
                placeholder="Class name (e.g. BJJ Fundamentals)"
                value={form.name}
                onChange={handleChange}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-red-500"
              />
              <input
                name="instructor"
                placeholder="Instructor name"
                value={form.instructor}
                onChange={handleChange}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-red-500"
              />
              <select
                name="day_of_week"
                value={form.day_of_week}
                onChange={handleChange}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500"
              >
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input
                name="start_time"
                type="time"
                value={form.start_time}
                onChange={handleChange}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500"
              />
              <input
                name="duration_minutes"
                type="number"
                placeholder="Duration (minutes)"
                value={form.duration_minutes}
                onChange={handleChange}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-red-500"
              />
              <input
                name="capacity"
                type="number"
                placeholder="Capacity"
                value={form.capacity}
                onChange={handleChange}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition"
              >
                {saving ? 'Saving...' : 'Save Class'}
              </button>
            </div>
          </div>
        )}

        {/* Classes List */}
        {loading ? (
          <p className="text-white/50">Loading classes...</p>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <p className="text-lg">No classes yet</p>
            <p className="text-sm mt-1">Click "+ New Class" to add your first class</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {classes.map(c => {
              const isExpanded = expandedId === c.id
              const enrolledIds = enrollments.map(e => e.member_id)
              const unenrolled = allMembers.filter(m => !enrolledIds.includes(m.id))

              return (
                <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  {/* Card Header — always visible */}
                  <div
                    className="flex justify-between items-center p-5 cursor-pointer hover:bg-white/[0.03] transition"
                    onClick={() => handleExpand(c.id)}
                  >
                    <div>
                      <h3 className="font-bold text-lg">{c.name}</h3>
                      <p className="text-white/50 text-sm mt-1">
                        {c.day_of_week} at {c.start_time.slice(0, 5)} · {c.duration_minutes} min
                      </p>
                      {c.instructor && (
                        <p className="text-white/40 text-sm mt-1">👤 {c.instructor}</p>
                      )}
                      <p className="text-white/40 text-sm mt-1">👥 Capacity: {c.capacity}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(c.id) }}
                        className="text-red-400/50 hover:text-red-400 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                      {isExpanded ? <ChevronUp size={18} className="text-white/40" /> : <ChevronDown size={18} className="text-white/40" />}
                    </div>
                  </div>

                  {/* Expanded Panel */}
                  {isExpanded && (
                    <div className="border-t border-white/10 px-5 pb-5 pt-4">
                      <h4 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">
                        Enrolled Members ({enrollLoading ? '...' : enrollments.length}/{c.capacity})
                      </h4>

                      {enrollLoading ? (
                        <p className="text-white/30 text-sm">Loading...</p>
                      ) : enrollments.length === 0 ? (
                        <p className="text-white/30 text-sm mb-3">No members enrolled yet.</p>
                      ) : (
                        <ul className="space-y-2 mb-4">
                          {enrollments.map(e => (
                            <li key={e.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2">
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {e.members.first_name} {e.members.last_name}
                                </p>
                                <p className="text-xs text-white/40">{e.members.email}</p>
                              </div>
                              <button
                                onClick={() => handleUnenroll(e.id, c.id)}
                                className="text-xs text-red-400/60 hover:text-red-400 transition"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Enroll a member */}
                      {!enrollLoading && enrollments.length < c.capacity && unenrolled.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          <select
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                            value={selectedMember}
                            onChange={e => setSelectedMember(e.target.value)}
                          >
                            <option value="">Select member to enroll...</option>
                            {unenrolled.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.first_name} {m.last_name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleEnroll(c.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
                          >
                            Enroll
                          </button>
                        </div>
                      )}

                      {!enrollLoading && enrollments.length >= c.capacity && (
                        <p className="text-yellow-400/70 text-sm mt-2">⚠️ Class is at full capacity.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
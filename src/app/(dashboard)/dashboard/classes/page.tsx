'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2 } from 'lucide-react'

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

        {/* Form */}
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

        {/* Classes by Day */}
        {loading ? (
          <p className="text-white/50">Loading classes...</p>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <p className="text-lg">No classes yet</p>
            <p className="text-sm mt-1">Click "+ New Class" to add your first class</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map(c => (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-start">
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
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-400/50 hover:text-red-400 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
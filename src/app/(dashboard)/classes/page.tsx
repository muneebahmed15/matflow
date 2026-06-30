'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffInfo } from '@/lib/permissions'
import { Dumbbell, Plus } from 'lucide-react'
import { createClassAction, deleteClassAction } from '@/app/(dashboard)/actions'
import { useAppUi } from '@/components/ui/AppUiProvider'
import PageLoader from '@/components/PageLoader'

interface Class {
  id: string; name: string; instructor: string
  day_of_week: string; start_time: string; end_time: string; capacity: number
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default function ClassesPage() {
  const { confirm, error: showError } = useAppUi()
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [gymId, setGymId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [instructor, setInstructor] = useState('')
  const [day, setDay] = useState('Monday')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [capacity, setCapacity] = useState('20')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const info = await getCurrentStaffInfo()
      if (!info.gymId) return
      setGymId(info.gymId)
      const { data } = await supabase.from('classes').select('*').eq('gym_id', info.gymId).order('day_of_week').order('start_time')
      setClasses(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleSubmit = async () => {
    if (!name || !instructor) { setError('Name and instructor are required.'); return }
    setSubmitting(true)
    setError('')
    const result = await createClassAction({
      name,
      instructor,
      dayOfWeek: day,
      startTime,
      endTime,
      capacity: parseInt(capacity, 10),
    })
    if (!result.ok) {
      setError(result.error)
      setSubmitting(false)
      return
    }
    const { data } = await supabase.from('classes').select('*').eq('gym_id', gymId).order('day_of_week').order('start_time')
    setClasses(data || [])
    setName(''); setInstructor(''); setDay('Monday'); setStartTime('09:00'); setEndTime('10:00'); setCapacity('20')
    setShowForm(false)
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete class',
      message: 'This removes the class from your schedule.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    const result = await deleteClassAction(id)
    if (result.ok) {
      setClasses(prev => prev.filter(c => c.id !== id))
    } else {
      showError(result.error)
    }
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"

  if (loading) return <PageLoader />

  const grouped = DAYS.reduce((acc, day) => {
    acc[day] = classes.filter(c => c.day_of_week === day)
    return acc
  }, {} as Record<string, Class[]>)

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Classes</h1>
          <p className="text-white/40 text-sm mt-1">Weekly class schedule.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          <Plus size={16} /> New Class
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-white">Add Class</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Class Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. BJJ Fundamentals" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Instructor</label>
              <input value={instructor} onChange={(e) => setInstructor(e.target.value)} placeholder="e.g. Coach John" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Day</label>
              <select value={day} onChange={(e) => setDay(e.target.value)} className={inputClass}>
                {DAYS.map(d => <option key={d} value={d} className="bg-gray-900">{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">End Time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-300 mb-1">Capacity</label>
            <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputClass} />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition">
              {submitting ? 'Adding...' : 'Add Class'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition">Cancel</button>
          </div>
        </div>
      )}

      {classes.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <Dumbbell size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No classes yet</p>
          <p className="text-white/20 text-sm mt-1">Add your first class to build the schedule.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {DAYS.filter(d => grouped[d]?.length > 0).map(day => (
            <div key={day}>
              <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-2">{day}</h2>
              <div className="space-y-2">
                {grouped[day].map((cls) => (
                  <div key={cls.id} className="bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <Dumbbell size={16} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{cls.name}</p>
                        <p className="text-xs text-white/30">{cls.instructor} · {cls.start_time} – {cls.end_time} · {cls.capacity} max</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(cls.id)} className="text-white/20 hover:text-red-400 text-xs transition">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

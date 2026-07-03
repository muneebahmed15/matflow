'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentStaffInfo } from '@/lib/permissions'
import { hasCapability } from '@/lib/permissions/capabilities'
import { Dumbbell, Plus } from 'lucide-react'
import {
  createClassAction,
  deleteClassAction,
  getEnrollmentCountsAction,
  listClassesAction,
  listStaffAction,
  updateClassAction,
} from '@/app/(dashboard)/actions'
import { useAppUi } from '@/components/ui/AppUiProvider'
import PageLoader from '@/components/PageLoader'
import ClassWaitlistPanel from '@/components/classes/ClassWaitlistPanel'
import ClassSessionPanel from '@/components/classes/ClassSessionPanel'

interface MemberOption {
  id: string; first_name: string; last_name: string
}

interface StaffOption {
  id: string
  full_name: string
  role: string
}

interface Class {
  id: string
  name: string
  instructor: string
  instructor_staff_id: string | null
  day_of_week: string
  start_time: string
  end_time: string
  capacity: number
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default function ClassesPage() {
  const { confirm, error: showError } = useAppUi()
  const [classes, setClasses] = useState<Class[]>([])
  const [enrollCounts, setEnrollCounts] = useState<Record<string, number>>({})
  const [members, setMembers] = useState<MemberOption[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)
  const [canManageClasses, setCanManageClasses] = useState(false)
  const [gymId, setGymId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [instructor, setInstructor] = useState('')
  const [instructorStaffId, setInstructorStaffId] = useState<string>('')
  const [day, setDay] = useState('Monday')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [capacity, setCapacity] = useState('20')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const reloadClasses = async () => {
    const result = await listClassesAction()
    if (result.ok && result.data) setClasses(result.data as Class[])
    else if (!result.ok) showError(result.error)
  }

  useEffect(() => {
    const load = async () => {
      const info = await getCurrentStaffInfo()
      if (!info.gymId) return
      setGymId(info.gymId)
      setCanManageClasses(hasCapability(info.role, 'classes.manage'))

      const [classResult, staffResult, countsResult, { data: membersData }] = await Promise.all([
        listClassesAction(),
        listStaffAction(),
        getEnrollmentCountsAction(),
        supabase.from('members').select('id, first_name, last_name').eq('gym_id', info.gymId).eq('status', 'active').order('first_name'),
      ])

      if (classResult.ok && classResult.data) setClasses(classResult.data as Class[])
      else if (!classResult.ok) showError(classResult.error)

      if (countsResult.ok && countsResult.data) setEnrollCounts(countsResult.data)

      if (staffResult.ok && staffResult.data) {
        setStaff(staffResult.data.map((s) => ({
          id: s.id,
          full_name: s.full_name,
          role: s.role,
        })))
      }

      setMembers(membersData || [])
      setLoading(false)
    }
    void load()
  }, [showError])

  const resetForm = () => {
    setName('')
    setInstructor('')
    setInstructorStaffId('')
    setDay('Monday')
    setStartTime('09:00')
    setEndTime('10:00')
    setCapacity('20')
    setEditingId(null)
  }

  const handleStaffPick = (staffId: string) => {
    setInstructorStaffId(staffId)
    const picked = staff.find((s) => s.id === staffId)
    if (picked) setInstructor(picked.full_name)
  }

  const handleSubmit = async () => {
    if (!name || !instructor) { setError('Name and instructor are required.'); return }
    setSubmitting(true)
    setError('')
    const result = await createClassAction({
      name,
      instructor,
      instructorStaffId: instructorStaffId || null,
      dayOfWeek: day,
      startTime,
      endTime,
      capacity: parseInt(capacity, 10),
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    await reloadClasses()
    resetForm()
    setShowForm(false)
  }

  const startEdit = (cls: Class) => {
    setEditingId(cls.id)
    setName(cls.name)
    setInstructor(cls.instructor)
    setInstructorStaffId(cls.instructor_staff_id ?? '')
    setDay(cls.day_of_week)
    setStartTime(cls.start_time)
    setEndTime(cls.end_time)
    setCapacity(String(cls.capacity))
    setShowForm(true)
  }

  const handleUpdate = async () => {
    if (!editingId || !name || !instructor) return
    setSubmitting(true)
    const result = await updateClassAction(editingId, {
      name,
      instructor,
      instructorStaffId: instructorStaffId || null,
      dayOfWeek: day,
      startTime,
      endTime,
      capacity: parseInt(capacity, 10),
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    await reloadClasses()
    resetForm()
    setShowForm(false)
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

  const grouped = DAYS.reduce((acc, dayName) => {
    acc[dayName] = classes.filter(c => c.day_of_week === dayName)
    return acc
  }, {} as Record<string, Class[]>)

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Classes</h1>
          <p className="text-white/40 text-sm mt-1">Weekly class schedule.</p>
        </div>
        {canManageClasses && (
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
            <Plus size={16} /> New Class
          </button>
        )}
      </div>

      {showForm && canManageClasses && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-white">{editingId ? 'Edit Class' : 'Add Class'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Class Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. BJJ Fundamentals" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Assigned instructor</label>
              <select
                value={instructorStaffId}
                onChange={(e) => handleStaffPick(e.target.value)}
                className={inputClass}
              >
                <option value="" className="bg-gray-900">Custom name below</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id} className="bg-gray-900">
                    {s.full_name} ({s.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Instructor display name</label>
            <input value={instructor} onChange={(e) => setInstructor(e.target.value)} placeholder="e.g. Coach John" className={inputClass} />
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
            <button onClick={() => (editingId ? void handleUpdate() : void handleSubmit())} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition">
              {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Add Class'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="px-4 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition">Cancel</button>
          </div>
        </div>
      )}

      {classes.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <Dumbbell size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No classes yet</p>
          <p className="text-white/20 text-sm mt-1">
            {canManageClasses ? 'Add your first class to build the schedule.' : 'No classes assigned to you yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {DAYS.filter(d => grouped[d]?.length > 0).map(dayName => (
            <div key={dayName}>
              <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-2">{dayName}</h2>
              <div className="space-y-2">
                {grouped[dayName].map((cls) => (
                  <div key={cls.id} className="bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <Dumbbell size={16} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{cls.name}</p>
                        <p className="text-xs text-white/30">
                          {cls.instructor} · {cls.start_time} – {cls.end_time} ·{' '}
                          <span className={(enrollCounts[cls.id] ?? 0) >= cls.capacity ? 'text-red-400' : ''}>
                            {enrollCounts[cls.id] ?? 0}/{cls.capacity} enrolled
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {canManageClasses && (
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(cls)} className="text-white/30 hover:text-blue-400 text-xs transition">Edit</button>
                          <button onClick={() => handleDelete(cls.id)} className="text-white/20 hover:text-red-400 text-xs transition">Remove</button>
                        </div>
                      )}
                      <ClassSessionPanel classId={cls.id} className={cls.name} instructor={cls.instructor} members={members} />
                      <ClassWaitlistPanel classId={cls.id} className={cls.name} members={members} />
                    </div>
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

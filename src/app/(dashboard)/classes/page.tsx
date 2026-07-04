'use client';

import { useCallback, useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import { hasCapability } from '@/lib/permissions/capabilities';
import { Dumbbell, Plus } from 'lucide-react';
import {
  createClassAction,
  createClassSeriesAction,
  deleteClassAction,
  deleteClassSeriesAction,
  duplicateClassAction,
  getClassAttendanceReportAction,
  getEnrollmentCountsAction,
  getStaffContextAction,
  listActiveMembersAction,
  listClassesAction,
  listStaffAction,
  updateClassAction,
} from '@/app/(dashboard)/actions';
import { CLASS_WEEKDAYS, formatSeriesLabel } from '@/lib/class-recurrence';
import { formatClassTime } from '@/lib/gym-public-time';
import { useAppUi } from '@/components/ui/AppUiProvider';
import PageLoader from '@/components/PageLoader';
import ClassWaitlistPanel from '@/components/classes/ClassWaitlistPanel';
import ClassSessionPanel from '@/components/classes/ClassSessionPanel';

interface MemberOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface StaffOption {
  id: string;
  full_name: string;
  role: string;
}

interface Class {
  id: string;
  name: string;
  description: string | null;
  instructor: string;
  instructor_staff_id: string | null;
  day_of_week: string;
  start_time: string;
  end_time: string;
  capacity: number;
  series_id: string | null;
  recurrence_rule: string | null;
}

const DAYS = CLASS_WEEKDAYS;

export default function ClassesPage() {
  const { confirm, error: showError } = useAppUi();
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrollCounts, setEnrollCounts] = useState<Record<string, number>>({});
  const [attendanceStats, setAttendanceStats] = useState<Record<string, { sessions: number; avg: number }>>({});
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManageClasses, setCanManageClasses] = useState(false);
  const [gymTimezone, setGymTimezone] = useState('America/Los_Angeles');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructor, setInstructor] = useState('');
  const [instructorStaffId, setInstructorStaffId] = useState<string>('');
  const [day, setDay] = useState('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [capacity, setCapacity] = useState('20');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSeries, setIsSeries] = useState(false);
  const [seriesDays, setSeriesDays] = useState<string[]>(['Monday', 'Wednesday']);

  const reloadClasses = async () => {
    const result = await listClassesAction();
    if (result.ok && result.data) setClasses(result.data as Class[]);
    else if (!result.ok) showError(result.error);
  };

  const loadPage = useCallback(async () => {
    const contextResult = await getStaffContextAction();
    if (!contextResult.ok || !contextResult.data) {
      if (!contextResult.ok) showError(contextResult.error);
      setLoading(false);
      return;
    }

    const { role, timezone } = contextResult.data;
    setGymTimezone(timezone);
    setCanManageClasses(hasCapability(role, 'classes.manage'));

    const [classResult, staffResult, countsResult, reportResult, membersResult] = await Promise.all([
      listClassesAction(),
      listStaffAction(),
      getEnrollmentCountsAction(),
      getClassAttendanceReportAction(30),
      listActiveMembersAction(),
    ]);

    if (classResult.ok && classResult.data) setClasses(classResult.data as Class[]);
    else if (!classResult.ok) showError(classResult.error);

    if (countsResult.ok && countsResult.data) setEnrollCounts(countsResult.data);

    if (reportResult.ok && reportResult.data) {
      const stats: Record<string, { sessions: number; avg: number }> = {};
      for (const r of reportResult.data) {
        stats[r.classId] = { sessions: r.sessions, avg: r.avgPerSession };
      }
      setAttendanceStats(stats);
    }

    if (staffResult.ok && staffResult.data) {
      setStaff(
        staffResult.data.map((s) => ({
          id: s.id,
          full_name: s.full_name,
          role: s.role,
        }))
      );
    }

    if (membersResult.ok && membersResult.data) {
      setMembers(
        membersResult.data.map((m) => ({
          id: m.id,
          first_name: m.first_name,
          last_name: m.last_name,
        }))
      );
    }

    setLoading(false);
  }, [showError]);

  useAsyncMount(loadPage, [loadPage]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setInstructor('');
    setInstructorStaffId('');
    setDay('Monday');
    setStartTime('09:00');
    setEndTime('10:00');
    setCapacity('20');
    setEditingId(null);
    setIsSeries(false);
    setSeriesDays(['Monday', 'Wednesday']);
  };

  const toggleSeriesDay = (dayName: string) => {
    setSeriesDays((prev) =>
      prev.includes(dayName) ? prev.filter((d) => d !== dayName) : [...prev, dayName]
    );
  };

  const handleStaffPick = (staffId: string) => {
    setInstructorStaffId(staffId);
    const picked = staff.find((s) => s.id === staffId);
    if (picked) setInstructor(picked.full_name);
  };

  const handleSubmit = async () => {
    if (!name || !instructor) {
      setError('Name and instructor are required.');
      return;
    }
    if (isSeries && seriesDays.length < 2) {
      setError('Select at least two days for a weekly series.');
      return;
    }
    setSubmitting(true);
    setError('');
    const payload = {
      name,
      description: description || undefined,
      instructor,
      instructorStaffId: instructorStaffId || null,
      startTime,
      endTime,
      capacity: parseInt(capacity, 10),
    };
    const result = isSeries
      ? await createClassSeriesAction({ ...payload, daysOfWeek: seriesDays })
      : await createClassAction({ ...payload, dayOfWeek: day });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await reloadClasses();
    resetForm();
    setShowForm(false);
  };

  const startEdit = (cls: Class) => {
    setEditingId(cls.id);
    setName(cls.name);
    setDescription(cls.description ?? '');
    setInstructor(cls.instructor);
    setInstructorStaffId(cls.instructor_staff_id ?? '');
    setDay(cls.day_of_week);
    setStartTime(cls.start_time);
    setEndTime(cls.end_time);
    setCapacity(String(cls.capacity));
    setShowForm(true);
  };

  const handleUpdate = async () => {
    if (!editingId || !name || !instructor) return;
    setSubmitting(true);
    const result = await updateClassAction(editingId, {
      name,
      description: description || null,
      instructor,
      instructorStaffId: instructorStaffId || null,
      dayOfWeek: day,
      startTime,
      endTime,
      capacity: parseInt(capacity, 10),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await reloadClasses();
    resetForm();
    setShowForm(false);
  };

  const handleDeleteSeries = async (seriesId: string) => {
    const ok = await confirm({
      title: 'Delete weekly series',
      message: 'This removes every class in the series from your schedule.',
      confirmLabel: 'Delete series',
      destructive: true,
    });
    if (!ok) return;
    const result = await deleteClassSeriesAction(seriesId);
    if (result.ok) await reloadClasses();
    else showError(result.error);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete class',
      message: 'This removes the class from your schedule.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    const result = await deleteClassAction(id);
    if (result.ok) {
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } else {
      showError(result.error);
    }
  };

  const handleDuplicate = async (cls: Class) => {
    const targetDay = window.prompt('Duplicate to which day?', cls.day_of_week);
    if (!targetDay || !DAYS.includes(targetDay)) return;
    const result = await duplicateClassAction(cls.id, targetDay);
    if (result.ok) await reloadClasses();
    else showError(result.error);
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) return <PageLoader />;

  const grouped = DAYS.reduce(
    (acc, dayName) => {
      acc[dayName] = classes.filter((c) => c.day_of_week === dayName);
      return acc;
    },
    {} as Record<string, Class[]>
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Classes</h1>
          <p className="text-white/40 text-sm mt-1">Weekly class schedule.</p>
        </div>
        {canManageClasses && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
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
              <select value={instructorStaffId} onChange={(e) => handleStaffPick(e.target.value)} className={inputClass}>
                <option value="" className="bg-gray-900">
                  Custom name below
                </option>
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What to expect in this class"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {!editingId && (
              <div className="col-span-3">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSeries}
                    onChange={(e) => setIsSeries(e.target.checked)}
                    className="rounded border-white/20 bg-white/5"
                  />
                  Weekly series (same class on multiple days)
                </label>
              </div>
            )}
            {isSeries && !editingId ? (
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d) => (
                    <label
                      key={d}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition ${
                        seriesDays.includes(d)
                          ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={seriesDays.includes(d)}
                        onChange={() => toggleSeriesDay(d)}
                      />
                      {d.slice(0, 3)}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Day</label>
                <select value={day} onChange={(e) => setDay(e.target.value)} className={inputClass}>
                  {DAYS.map((d) => (
                    <option key={d} value={d} className="bg-gray-900">
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
            <button
              onClick={() => (editingId ? void handleUpdate() : void handleSubmit())}
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition"
            >
              {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Add Class'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="px-4 border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition"
            >
              Cancel
            </button>
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
          {DAYS.filter((d) => grouped[d]?.length > 0).map((dayName) => (
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white">{cls.name}</p>
                          {cls.series_id && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              {formatSeriesLabel(cls.recurrence_rule)}
                            </span>
                          )}
                        </div>
                        {cls.description && <p className="text-xs text-white/40 mt-0.5">{cls.description}</p>}
                        <p className="text-xs text-white/30">
                          {cls.instructor} · {formatClassTime(cls.start_time, gymTimezone)} –{' '}
                          {formatClassTime(cls.end_time, gymTimezone)} ·{' '}
                          <span className={(enrollCounts[cls.id] ?? 0) >= cls.capacity ? 'text-red-400' : ''}>
                            {enrollCounts[cls.id] ?? 0}/{cls.capacity} enrolled
                          </span>
                          {attendanceStats[cls.id] && attendanceStats[cls.id].sessions > 0 && (
                            <> · avg {attendanceStats[cls.id].avg}/session (30d)</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {canManageClasses && (
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(cls)} className="text-white/30 hover:text-blue-400 text-xs transition">
                            Edit
                          </button>
                          <button onClick={() => void handleDuplicate(cls)} className="text-white/30 hover:text-blue-400 text-xs transition">
                            Duplicate
                          </button>
                          {cls.series_id && (
                            <button
                              onClick={() => void handleDeleteSeries(cls.series_id!)}
                              className="text-white/30 hover:text-red-400 text-xs transition"
                            >
                              Delete series
                            </button>
                          )}
                          <button onClick={() => handleDelete(cls.id)} className="text-white/20 hover:text-red-400 text-xs transition">
                            Remove
                          </button>
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
  );
}

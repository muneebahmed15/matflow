'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import { hasCapability } from '@/lib/permissions/capabilities';
import { Dumbbell, Plus } from 'lucide-react';
import {
  createClassAction,
  createClassSeriesAction,
  cancelClassDateAction,
  copyScheduleFromGymAction,
  deleteClassAction,
  deleteClassSeriesAction,
  duplicateClassAction,
  getClassAttendanceReportAction,
  getClassRevenueReportAction,
  getEnrollmentCountsAction,
  getStaffContextAction,
  listActiveMembersAction,
  listClassScheduleExceptionsAction,
  listClassesAction,
  listScheduleTemplateGymsAction,
  listStaffAction,
  restoreClassDateAction,
  updateClassAction,
} from '@/app/(dashboard)/actions';
import { CLASS_WEEKDAYS, formatSeriesLabel } from '@/lib/class-recurrence';
import { nextDateForWeekday } from '@/lib/class-weekday-date';
import { CLASS_CATEGORY_PRESETS, CLASS_COLOR_PRESETS, classAccentColor } from '@/lib/class-tags';
import { effectiveEnrollmentLimit } from '@/lib/class-capacity';
import { isLowAttendanceClass, lowAttendanceDescription } from '@/lib/class-attendance-alerts';
import { detectAllInstructorConflicts } from '@/lib/class-schedule-conflicts';
import { formatClassTime } from '@/lib/gym-public-time';
import { useAppUi } from '@/components/ui/AppUiProvider';
import PageLoader from '@/components/PageLoader';
import ClassWaitlistPanel from '@/components/classes/ClassWaitlistPanel';
import ClassSessionPanel from '@/components/classes/ClassSessionPanel';
import SeasonalTemplatesPanel from '@/components/classes/SeasonalTemplatesPanel';
import ClassStaffAccessPanel from '@/components/classes/ClassStaffAccessPanel';
import type { StaffRole } from '@/lib/permissions/capabilities';

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
  category_tag: string | null;
  color: string | null;
  overbook_allowance: number;
  series_id: string | null;
  recurrence_rule: string | null;
}

const DAYS = CLASS_WEEKDAYS;

export default function ClassesPage() {
  const { confirm, error: showError } = useAppUi();
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrollCounts, setEnrollCounts] = useState<Record<string, number>>({});
  const [attendanceStats, setAttendanceStats] = useState<Record<string, { sessions: number; avg: number }>>({});
  const [revenueStats, setRevenueStats] = useState<
    Record<string, { attributedMrrCents: number; dropInBookings30d: number; sharePercent: number }>
  >({});
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManageClasses, setCanManageClasses] = useState(false);
  const [staffRole, setStaffRole] = useState<StaffRole>('coach');
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [categoryTag, setCategoryTag] = useState('');
  const [color, setColor] = useState<string>(CLASS_COLOR_PRESETS[0].value);
  const [overbookAllowance, setOverbookAllowance] = useState('0');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSeries, setIsSeries] = useState(false);
  const [seriesDays, setSeriesDays] = useState<string[]>(['Monday', 'Wednesday']);
  const [cancelledDates, setCancelledDates] = useState<Set<string>>(new Set());
  const [templateGyms, setTemplateGyms] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [copySourceGymId, setCopySourceGymId] = useState('');
  const [copyingSchedule, setCopyingSchedule] = useState(false);

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
    setStaffRole(role);
    setIsAdmin(role === 'admin');
    setGymTimezone(timezone);
    setCanManageClasses(hasCapability(role, 'classes.manage'));

    const [classResult, staffResult, countsResult, reportResult, revenueResult, membersResult, exceptionsResult, templatesResult] =
      await Promise.all([
        listClassesAction(),
        listStaffAction(),
        getEnrollmentCountsAction(),
        getClassAttendanceReportAction(30),
        hasCapability(role, 'classes.manage') ? getClassRevenueReportAction() : Promise.resolve({ ok: true as const, data: [] }),
        listActiveMembersAction(),
        listClassScheduleExceptionsAction(),
        role === 'admin' ? listScheduleTemplateGymsAction() : Promise.resolve({ ok: true as const, data: [] }),
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

    if (revenueResult.ok && revenueResult.data) {
      const stats: Record<string, { attributedMrrCents: number; dropInBookings30d: number; sharePercent: number }> = {};
      for (const row of revenueResult.data) {
        stats[row.classId] = {
          attributedMrrCents: row.attributedMrrCents,
          dropInBookings30d: row.dropInBookings30d,
          sharePercent: row.sharePercent,
        };
      }
      setRevenueStats(stats);
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

    if (exceptionsResult.ok && exceptionsResult.data) {
      setCancelledDates(
        new Set(exceptionsResult.data.map((e) => `${e.class_id}:${e.exception_date}`))
      );
    }

    if (templatesResult.ok && templatesResult.data) {
      setTemplateGyms(templatesResult.data);
      if (templatesResult.data.length > 0) {
        setCopySourceGymId(templatesResult.data[0].id);
      }
    }

    setLoading(false);
  }, [showError]);

  useAsyncMount(loadPage, [loadPage]);

  const instructorConflicts = useMemo(
    () =>
      detectAllInstructorConflicts(
        classes.map((c) => ({
          id: c.id,
          name: c.name,
          instructorStaffId: c.instructor_staff_id,
          dayOfWeek: c.day_of_week,
          startTime: c.start_time,
          endTime: c.end_time,
        }))
      ),
    [classes]
  );
  const conflictClassIds = useMemo(
    () => new Set(instructorConflicts.flatMap((c) => [c.classId, c.conflictsWithId])),
    [instructorConflicts]
  );

  const lowAttendanceClassIds = useMemo(() => {
    const ids = new Set<string>();
    for (const cls of classes) {
      const stats = attendanceStats[cls.id];
      if (!stats) continue;
      if (
        isLowAttendanceClass({
          avgPerSession: stats.avg,
          capacity: cls.capacity,
          sessions: stats.sessions,
        })
      ) {
        ids.add(cls.id);
      }
    }
    return ids;
  }, [classes, attendanceStats]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setInstructor('');
    setInstructorStaffId('');
    setDay('Monday');
    setStartTime('09:00');
    setEndTime('10:00');
    setCapacity('20');
    setCategoryTag('');
    setColor(CLASS_COLOR_PRESETS[0].value);
    setOverbookAllowance('0');
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
      categoryTag: categoryTag.trim() || null,
      color: color || null,
      overbookAllowance: parseInt(overbookAllowance, 10) || 0,
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
    setCategoryTag(cls.category_tag ?? '');
    setColor(cls.color ?? CLASS_COLOR_PRESETS[0].value);
    setOverbookAllowance(String(cls.overbook_allowance ?? 0));
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
      categoryTag: categoryTag.trim() || null,
      color: color || null,
      overbookAllowance: parseInt(overbookAllowance, 10) || 0,
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

  const reloadExceptions = async () => {
    const result = await listClassScheduleExceptionsAction();
    if (result.ok && result.data) {
      setCancelledDates(
        new Set(result.data.map((e) => `${e.class_id}:${e.exception_date}`))
      );
    }
  };

  const handleCancelNext = async (cls: Class) => {
    const date = nextDateForWeekday(cls.day_of_week);
    if (!date) return;
    const ok = await confirm({
      title: 'Cancel class date',
      message: `Cancel ${cls.name} on ${date}? Members will not be able to book drop-ins for that day.`,
      confirmLabel: 'Cancel class',
      destructive: true,
    });
    if (!ok) return;
    const reason = window.prompt('Reason (optional)?') ?? undefined;
    const result = await cancelClassDateAction({
      classId: cls.id,
      exceptionDate: date,
      reason,
    });
    if (result.ok) await reloadExceptions();
    else showError(result.error);
  };

  const handleRestoreNext = async (cls: Class) => {
    const date = nextDateForWeekday(cls.day_of_week);
    if (!date) return;
    const result = await restoreClassDateAction({ classId: cls.id, exceptionDate: date });
    if (result.ok) await reloadExceptions();
    else showError(result.error);
  };

  const isNextOccurrenceCancelled = (cls: Class) => {
    const date = nextDateForWeekday(cls.day_of_week);
    return Boolean(date && cancelledDates.has(`${cls.id}:${date}`));
  };

  const handleCopySchedule = async () => {
    if (!copySourceGymId) return;
    const source = templateGyms.find((g) => g.id === copySourceGymId);
    const ok = await confirm({
      title: 'Copy class schedule',
      message: `Copy all active classes from ${source?.name ?? 'the selected gym'}? Existing classes will remain; new copies will be added.`,
      confirmLabel: 'Copy schedule',
    });
    if (!ok) return;
    setCopyingSchedule(true);
    const result = await copyScheduleFromGymAction(copySourceGymId);
    setCopyingSchedule(false);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    await reloadClasses();
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) return <PageLoader />;

  const canManageSession = canManageClasses || staffRole === 'coach';

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

      {canManageClasses && templateGyms.length > 0 && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-white mb-1">Copy schedule from another gym</p>
            <p className="text-white/40 text-xs mb-2">
              Duplicate active classes from another gym you own. Instructor staff links copy only when the same staff member exists here.
            </p>
            <select
              value={copySourceGymId}
              onChange={(e) => setCopySourceGymId(e.target.value)}
              className={inputClass}
            >
              {templateGyms.map((gym) => (
                <option key={gym.id} value={gym.id} className="bg-gray-900">
                  {gym.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => void handleCopySchedule()}
            disabled={copyingSchedule || !copySourceGymId}
            className="bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            {copyingSchedule ? 'Copying…' : 'Copy schedule'}
          </button>
        </div>
      )}

      {isAdmin && <SeasonalTemplatesPanel onApplied={loadPage} />}

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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category tag</label>
              <input
                value={categoryTag}
                onChange={(e) => setCategoryTag(e.target.value)}
                list="class-category-presets"
                placeholder="e.g. BJJ"
                className={inputClass}
              />
              <datalist id="class-category-presets">
                {CLASS_CATEGORY_PRESETS.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Accent color</label>
              <select value={color} onChange={(e) => setColor(e.target.value)} className={inputClass}>
                {CLASS_COLOR_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value} className="bg-gray-900">
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Overbook allowance</label>
              <input
                type="number"
                min={0}
                max={50}
                value={overbookAllowance}
                onChange={(e) => setOverbookAllowance(e.target.value)}
                className={inputClass}
              />
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
          {lowAttendanceClassIds.size > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 text-sm text-orange-100/90">
              {lowAttendanceClassIds.size} class{lowAttendanceClassIds.size === 1 ? '' : 'es'} with low
              attendance. {lowAttendanceDescription()}
            </div>
          )}
          {instructorConflicts.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-sm text-yellow-200/90">
              {instructorConflicts.length} instructor schedule conflict
              {instructorConflicts.length === 1 ? '' : 's'} detected. Overlapping classes are marked below.
            </div>
          )}
          {DAYS.filter((d) => grouped[d]?.length > 0).map((dayName) => (
            <div key={dayName}>
              <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-2">{dayName}</h2>
              <div className="space-y-2">
                {grouped[dayName].map((cls) => {
                  const accent = classAccentColor(cls.color);
                  const enrollmentLimit =
                    effectiveEnrollmentLimit(cls.capacity, cls.overbook_allowance ?? 0) ?? cls.capacity;
                  const enrolled = enrollCounts[cls.id] ?? 0;
                  return (
                  <div
                    key={cls.id}
                    className="bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center justify-between"
                    style={{ borderLeftWidth: 4, borderLeftColor: accent }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${accent}20` }}
                      >
                        <Dumbbell size={16} style={{ color: accent }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white">{cls.name}</p>
                          {cls.category_tag && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                              style={{
                                color: accent,
                                borderColor: `${accent}40`,
                                backgroundColor: `${accent}15`,
                              }}
                            >
                              {cls.category_tag}
                            </span>
                          )}
                          {cls.series_id && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              {formatSeriesLabel(cls.recurrence_rule)}
                            </span>
                          )}
                          {conflictClassIds.has(cls.id) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
                              Instructor conflict
                            </span>
                          )}
                          {lowAttendanceClassIds.has(cls.id) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/10 text-orange-300 border border-orange-500/20">
                              Low attendance
                            </span>
                          )}
                          {isNextOccurrenceCancelled(cls) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-300 border border-red-500/20">
                              Cancelled {nextDateForWeekday(cls.day_of_week)}
                            </span>
                          )}
                        </div>
                        {cls.description && <p className="text-xs text-white/40 mt-0.5">{cls.description}</p>}
                        <p className="text-xs text-white/30">
                          {cls.instructor} · {formatClassTime(cls.start_time, gymTimezone)} –{' '}
                          {formatClassTime(cls.end_time, gymTimezone)} ·{' '}
                          <span className={enrolled >= enrollmentLimit ? 'text-red-400' : ''}>
                            {enrolled}/{cls.capacity}
                            {(cls.overbook_allowance ?? 0) > 0
                              ? ` (+${cls.overbook_allowance} overbook)`
                              : ''}{' '}
                            enrolled
                          </span>
                          {attendanceStats[cls.id] && attendanceStats[cls.id].sessions > 0 && (
                            <> · avg {attendanceStats[cls.id].avg}/session (30d)</>
                          )}
                          {revenueStats[cls.id] && revenueStats[cls.id].attributedMrrCents > 0 && (
                            <>
                              {' '}
                              · ${(revenueStats[cls.id].attributedMrrCents / 100).toFixed(0)}/mo attributed
                              {revenueStats[cls.id].sharePercent > 0
                                ? ` (${revenueStats[cls.id].sharePercent}%)`
                                : ''}
                            </>
                          )}
                          {revenueStats[cls.id] && revenueStats[cls.id].dropInBookings30d > 0 && (
                            <> · {revenueStats[cls.id].dropInBookings30d} drop-ins (30d)</>
                          )}
                        </p>
                        {isAdmin && (
                          <ClassStaffAccessPanel
                            classId={cls.id}
                            instructorStaffId={cls.instructor_staff_id}
                            staff={staff}
                          />
                        )}
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
                          {canManageClasses &&
                            (isNextOccurrenceCancelled(cls) ? (
                              <button
                                onClick={() => void handleRestoreNext(cls)}
                                className="text-white/30 hover:text-green-400 text-xs transition"
                              >
                                Restore next
                              </button>
                            ) : (
                              <button
                                onClick={() => void handleCancelNext(cls)}
                                className="text-white/30 hover:text-red-400 text-xs transition"
                              >
                                Cancel next
                              </button>
                            ))}
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
                      <ClassSessionPanel
                        classId={cls.id}
                        className={cls.name}
                        instructor={cls.instructor}
                        members={members}
                        staff={staff}
                        canManage={canManageSession}
                      />
                      <ClassWaitlistPanel classId={cls.id} className={cls.name} members={members} />
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import {
  getClassSessionAction,
  markClassSessionAttendanceAction,
  removeClassSessionAttendanceAction,
  updateClassSessionSubstituteAction,
} from '@/app/(dashboard)/actions';
import { effectiveSessionInstructor } from '@/lib/class-sessions-display';

type Member = { id: string; first_name: string; last_name: string };
type StaffOption = { id: string; full_name: string; role: string };

type Props = {
  classId: string;
  className: string;
  instructor: string;
  members: Member[];
  staff: StaffOption[];
  canManage: boolean;
};

export default function ClassSessionPanel({
  classId,
  className,
  instructor,
  members,
  staff,
  canManage,
}: Props) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionInstructor, setSessionInstructor] = useState<string | null>(null);
  const [substituteName, setSubstituteName] = useState('');
  const [substituteStaffId, setSubstituteStaffId] = useState('');
  const [attended, setAttended] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [savingSubstitute, setSavingSubstitute] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await getClassSessionAction(classId, instructor);
    if (res.ok && res.data) {
      const session = res.data.session as {
        id: string;
        instructor: string | null;
        substitute_instructor: string | null;
        substitute_staff_id: string | null;
      };
      setSessionId(session.id);
      setSessionInstructor(effectiveSessionInstructor(session));
      setSubstituteName(session.substitute_instructor ?? '');
      setSubstituteStaffId(session.substitute_staff_id ?? '');
      setAttended(
        new Set((res.data.attendance as { member_id: string }[]).map((a) => a.member_id))
      );
    }
    setLoading(false);
  };

  useAsyncMount(() => {
    if (open) void load();
  }, [open, classId]);

  const toggle = async (memberId: string) => {
    if (!sessionId) return;
    if (attended.has(memberId)) {
      await removeClassSessionAttendanceAction(sessionId, memberId);
      setAttended((prev) => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
    } else {
      await markClassSessionAttendanceAction(sessionId, memberId);
      setAttended((prev) => new Set(prev).add(memberId));
    }
  };

  const handleStaffPick = (staffId: string) => {
    setSubstituteStaffId(staffId);
    const picked = staff.find((s) => s.id === staffId);
    if (picked) setSubstituteName(picked.full_name);
  };

  const saveSubstitute = async () => {
    if (!sessionId || !canManage) return;
    setSavingSubstitute(true);
    const res = await updateClassSessionSubstituteAction(sessionId, {
      substituteInstructor: substituteName || null,
      substituteStaffId: substituteStaffId || null,
    });
    setSavingSubstitute(false);
    if (res.ok && res.data) {
      setSessionInstructor(
        effectiveSessionInstructor({
          instructor,
          substitute_instructor: res.data.substitute_instructor,
        })
      );
    }
  };

  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} className="text-xs text-blue-400 hover:underline">
        {open ? 'Hide' : "Today's"} attendance ({attended.size})
      </button>
      {open && (
        <div className="mt-2 bg-black/30 border border-white/10 rounded-xl p-3 max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-white/30 text-xs">Loading...</p>
          ) : (
            <>
              <p className="text-white/40 text-xs mb-2">
                {className} — today
                {sessionInstructor && <> · {sessionInstructor}</>}
              </p>
              {canManage && sessionId && (
                <div className="mb-3 pb-3 border-b border-white/10 space-y-2">
                  <p className="text-white/50 text-xs font-medium">Substitute instructor</p>
                  <select
                    value={substituteStaffId}
                    onChange={(e) => handleStaffPick(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs"
                  >
                    <option value="" className="bg-gray-900">
                      Custom name below
                    </option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id} className="bg-gray-900">
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={substituteName}
                    onChange={(e) => setSubstituteName(e.target.value)}
                    placeholder="Substitute display name"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs"
                  />
                  <button
                    onClick={() => void saveSubstitute()}
                    disabled={savingSubstitute}
                    className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                  >
                    {savingSubstitute ? 'Saving...' : 'Save substitute'}
                  </button>
                </div>
              )}
              <div className="space-y-1">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attended.has(m.id)}
                      onChange={() => void toggle(m.id)}
                      className="rounded accent-blue-500"
                    />
                    {m.first_name} {m.last_name}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

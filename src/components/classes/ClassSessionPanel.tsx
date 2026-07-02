'use client';

import { useEffect, useState } from 'react';
import {
  getClassSessionAction,
  markClassSessionAttendanceAction,
  removeClassSessionAttendanceAction,
} from '@/app/(dashboard)/actions';

type Member = { id: string; first_name: string; last_name: string };

type Props = {
  classId: string;
  className: string;
  instructor: string;
  members: Member[];
};

export default function ClassSessionPanel({ classId, className, instructor, members }: Props) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attended, setAttended] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await getClassSessionAction(classId, instructor);
    if (res.ok && res.data) {
      setSessionId(res.data.session.id);
      setAttended(
        new Set(
          (res.data.attendance as { member_id: string }[]).map((a) => a.member_id)
        )
      );
    }
    setLoading(false);
  };

  useEffect(() => {
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

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-blue-400 hover:underline"
      >
        {open ? 'Hide' : "Today's"} attendance ({attended.size})
      </button>
      {open && (
        <div className="mt-2 bg-black/30 border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto">
          {loading ? (
            <p className="text-white/30 text-xs">Loading...</p>
          ) : (
            <>
              <p className="text-white/40 text-xs mb-2">{className} — today</p>
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

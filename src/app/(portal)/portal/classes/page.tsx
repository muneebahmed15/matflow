'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Calendar } from 'lucide-react';
import { usePortalMember } from '@/lib/portal-member-context';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type GymClass = {
  id: string;
  name: string;
  instructor: string | null;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
};

type WaitlistEntry = {
  id: string;
  class_id: string;
  position: number;
  classes: { name: string; day_of_week: string | null } | null;
};

type Enrollment = {
  id: string;
  class_id: string;
  classes: { name: string; day_of_week: string | null; start_time: string | null } | null;
};

export default function PortalClassesPage() {
  const { activeMember, loading: memberLoading } = usePortalMember();
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    if (!activeMember) return;
    const [{ data: classData }, { data: wl }, { data: enr }] = await Promise.all([
      supabase
        .from('classes')
        .select('id, name, instructor, day_of_week, start_time, end_time')
        .eq('gym_id', activeMember.gym_id)
        .eq('is_active', true)
        .order('day_of_week'),
      supabase
        .from('class_waitlist')
        .select('id, class_id, position, classes(name, day_of_week)')
        .eq('member_id', activeMember.id)
        .eq('status', 'waiting'),
      supabase
        .from('class_enrollments')
        .select('id, class_id, classes(name, day_of_week, start_time)')
        .eq('member_id', activeMember.id)
        .eq('status', 'active'),
    ]);

    setClasses((classData as GymClass[]) ?? []);
    setWaitlist((wl as unknown as WaitlistEntry[]) ?? []);
    setEnrollments((enr as unknown as Enrollment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [activeMember]);

  const toggleWaitlist = async (classId: string, onList: boolean) => {
    if (!activeMember) return;
    setBusy(classId);
    setError('');
    await fetch('/api/portal/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: classId,
        action: onList ? 'leave' : 'join',
        member_id: activeMember.id,
      }),
    });
    await load();
    setBusy(null);
  };

  const toggleBooking = async (classId: string, booked: boolean) => {
    if (!activeMember) return;
    setBusy(classId);
    setError('');
    const res = await fetch('/api/portal/enrollment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: classId,
        action: booked ? 'cancel' : 'book',
        member_id: activeMember.id,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error || 'Booking failed.');
    }
    await load();
    setBusy(null);
  };

  const todayName = DAYS[new Date().getDay()];
  const upcoming = classes.filter((c) => c.day_of_week === todayName);

  if (memberLoading || loading || !activeMember) {
    return <p className="text-white/40 py-12 text-center">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal" className="text-sm text-gray-400 hover:text-white">← Back</Link>
        <h1 className="text-2xl font-bold mt-2">Class Schedule</h1>
        <p className="text-white/40 text-sm mt-1">
          {activeMember.first_name} {activeMember.last_name}
        </p>
      </div>

      {upcoming.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
          <p className="text-blue-300 text-sm font-medium flex items-center gap-2">
            <Calendar size={16} /> Today ({todayName})
          </p>
          <ul className="mt-2 space-y-1 text-sm text-white/70">
            {upcoming.map((c) => (
              <li key={c.id}>
                {c.name} · {c.start_time} – {c.end_time}
              </li>
            ))}
          </ul>
        </div>
      )}

      {enrollments.length > 0 && (
        <div>
          <h2 className="font-semibold text-white mb-2">My Classes</h2>
          <div className="space-y-2">
            {enrollments.map((e) => (
              <div key={e.id} className="bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3 flex justify-between text-sm">
                <span>
                  {e.classes?.name}
                  {e.classes?.day_of_week ? ` · ${e.classes.day_of_week}` : ''}
                  {e.classes?.start_time ? ` · ${e.classes.start_time}` : ''}
                </span>
                <button
                  disabled={busy === e.class_id}
                  onClick={() => void toggleBooking(e.class_id, true)}
                  className="text-red-400 text-xs hover:underline"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {waitlist.length > 0 && (
        <div>
          <h2 className="font-semibold text-white mb-2">My Waitlist</h2>
          <div className="space-y-2">
            {waitlist.map((w) => (
              <div key={w.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex justify-between text-sm">
                <span>{w.classes?.name} · position {w.position}</span>
                <button
                  onClick={() => void toggleWaitlist(w.class_id, true)}
                  className="text-red-400 text-xs hover:underline"
                >
                  Leave
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="space-y-2">
        {classes.length === 0 ? (
          <p className="text-white/30 text-sm">No classes scheduled.</p>
        ) : (
          classes.map((c) => {
            const onList = waitlist.some((w) => w.class_id === c.id);
            const booked = enrollments.some((e) => e.class_id === c.id);
            return (
              <div key={c.id} className="bg-[#111] border border-white/10 rounded-xl px-4 py-3 flex justify-between items-center gap-4">
                <div>
                  <p className="text-white font-medium">{c.name}</p>
                  <p className="text-white/40 text-xs">
                    {c.day_of_week} · {c.start_time} – {c.end_time}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={busy === c.id}
                    onClick={() => void toggleBooking(c.id, booked)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                      booked
                        ? 'bg-green-500/15 text-green-300 hover:bg-green-500/25'
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    {booked ? 'Booked ✓' : 'Book'}
                  </button>
                  {!booked && (
                    <button
                      disabled={busy === c.id}
                      onClick={() => void toggleWaitlist(c.id, onList)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white"
                    >
                      {onList ? 'On waitlist' : 'Waitlist'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

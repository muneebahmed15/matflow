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

export default function PortalClassesPage() {
  const { activeMember, loading: memberLoading } = usePortalMember();
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!activeMember) return;
    const [{ data: classData }, { data: wl }] = await Promise.all([
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
    ]);

    setClasses((classData as GymClass[]) ?? []);
    setWaitlist((wl as unknown as WaitlistEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [activeMember]);

  const toggleWaitlist = async (classId: string, onList: boolean) => {
    if (!activeMember) return;
    setBusy(classId);
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

      <div className="space-y-2">
        {classes.length === 0 ? (
          <p className="text-white/30 text-sm">No classes scheduled.</p>
        ) : (
          classes.map((c) => {
            const onList = waitlist.some((w) => w.class_id === c.id);
            return (
              <div key={c.id} className="bg-[#111] border border-white/10 rounded-xl px-4 py-3 flex justify-between items-center gap-4">
                <div>
                  <p className="text-white font-medium">{c.name}</p>
                  <p className="text-white/40 text-xs">
                    {c.day_of_week} · {c.start_time} – {c.end_time}
                  </p>
                </div>
                <button
                  disabled={busy === c.id}
                  onClick={() => void toggleWaitlist(c.id, onList)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white"
                >
                  {onList ? 'On waitlist' : 'Join waitlist'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

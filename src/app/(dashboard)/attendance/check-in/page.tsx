'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import { getCheckInPageDataAction } from '@/app/(dashboard)/actions';

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
};

type TodayClass = {
  id: string;
  name: string;
  start_time: string | null;
};

export default function CheckInPage() {
  const [gymId, setGymId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [checkedIn, setCheckedIn] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    const result = await getCheckInPageDataAction();
    if (result.ok && result.data) {
      setMembers(result.data.members);
      setCheckedIn(new Set(result.data.checkedInMemberIds));
      setGymId(result.data.gymId);
      const classesRes = await fetch(`/api/public/todays-classes?gym_id=${result.data.gymId}`);
      if (classesRes.ok) {
        const body = (await classesRes.json()) as { data?: TodayClass[] };
        setTodayClasses(body.data ?? []);
      }
    }
    setPageLoading(false);
  }, []);

  useAsyncMount(load, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.first_name.toLowerCase().includes(q) ||
        m.last_name.toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q)
    );
  }, [search, members]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCheckIn = async (member: Member) => {
    if (!gymId) return;
    setLoading(member.id);

    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: member.id,
        gym_id: gymId,
        ...(selectedClassId ? { class_id: selectedClassId } : {}),
      }),
    });

    const data = (await res.json()) as { error?: string };
    setLoading(null);

    if (!res.ok) {
      if (res.status === 409) {
        setCheckedIn((prev) => new Set([...prev, member.id]));
      }
      showToast(data.error || 'Check-in failed', 'error');
      return;
    }

    setCheckedIn((prev) => new Set([...prev, member.id]));
    showToast(`${member.first_name} ${member.last_name} checked in`, 'success');
  };

  if (pageLoading) {
    return <div className="p-8 max-w-2xl mx-auto text-center text-white/40 py-12">Loading...</div>;
  }

  if (!gymId) {
    return <div className="p-8 max-w-2xl mx-auto text-center text-white/40 py-12">No gym access found for your account.</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1">Check-In</h1>
      <p className="text-white/50 text-sm mb-6">
        Search for a member and tap to check them in. Unsigned or expired waivers are blocked when enabled in Settings.
      </p>

      {toast && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${
            toast.type === 'success'
              ? 'bg-green-500/10 text-green-400 border-green-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}
        >
          {toast.message}
        </div>
      )}

      {todayClasses.length > 0 && (
        <div className="mb-4">
          <p className="text-white/40 text-xs mb-2">Link check-in to class (optional)</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedClassId(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                selectedClassId === null
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-200'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
            >
              General
            </button>
            {todayClasses.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClassId(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  selectedClassId === c.id
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-200'
                    : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-white/30 text-sm text-center py-12">No members found.</p>}
        {filtered.map((member) => {
          const done = checkedIn.has(member.id);
          const busy = loading === member.id;
          return (
            <div key={member.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <div>
                <p className="text-white font-semibold">
                  {member.first_name} {member.last_name}
                </p>
                <p className="text-white/40 text-xs">{member.email}</p>
              </div>
              <button
                onClick={() => void handleCheckIn(member)}
                disabled={done || busy}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  done
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30 cursor-default'
                    : busy
                      ? 'bg-white/5 text-white/30 cursor-wait'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {done ? 'Checked In ✓' : busy ? 'Checking...' : 'Check In'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

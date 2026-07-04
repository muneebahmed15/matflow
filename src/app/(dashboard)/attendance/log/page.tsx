'use client';

import { useCallback, useEffect, useState } from 'react';
import { listAttendanceLogAction } from '@/app/(dashboard)/actions';

type AttendanceRecord = {
  id: string;
  checked_in_at: string;
  members: {
    first_name: string;
    last_name: string;
    email: string;
  };
};

export default function AttendanceLogPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAttendanceLogAction(date);
    if (result.ok && result.data) {
      setRecords(result.data);
      setHasAccess(true);
    } else if (!result.ok) {
      setHasAccess(false);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!hasAccess && !loading) {
    return <div className="p-8 max-w-3xl mx-auto text-white/40">No gym access found for your account.</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1">Attendance Log</h1>
      <p className="text-white/50 text-sm mb-6">View check-ins by date.</p>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <p className="text-sm text-white/40 mb-4">
        {loading ? 'Loading...' : `${records.length} check-in${records.length !== 1 ? 's' : ''} on ${date}`}
      </p>

      {!loading && records.length === 0 && (
        <p className="text-white/30 text-sm text-center py-12">No check-ins for this date.</p>
      )}

      <div className="space-y-2">
        {records.map((r) => (
          <div key={r.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <div>
              <p className="text-white font-semibold">
                {r.members.first_name} {r.members.last_name}
              </p>
              <p className="text-white/40 text-xs">{r.members.email}</p>
            </div>
            <span className="text-white/40 text-xs">
              {new Date(r.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

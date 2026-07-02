'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import {
  addToClassWaitlistAction,
  listClassWaitlistAction,
  removeFromClassWaitlistAction,
} from '@/app/(dashboard)/actions';
import type { ClassWaitlistEntry } from '@/services/class-waitlist';

type MemberOption = { id: string; first_name: string; last_name: string };

type Props = {
  classId: string;
  className: string;
  members: MemberOption[];
};

export default function ClassWaitlistPanel({ classId, className, members }: Props) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ClassWaitlistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const result = await listClassWaitlistAction(classId);
    if (result.ok && result.data) setEntries(result.data);
    setLoading(false);
  };

  useEffect(() => {
    if (open) void load();
  }, [open, classId]);

  const handleAdd = async () => {
    if (!memberId) return;
    setSubmitting(true);
    setError('');
    const result = await addToClassWaitlistAction({ classId, memberId });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMemberId('');
    void load();
  };

  const handleRemove = async (waitlistId: string) => {
    const result = await removeFromClassWaitlistAction(waitlistId);
    if (result.ok) setEntries((prev) => prev.filter((e) => e.id !== waitlistId));
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-white/30 hover:text-blue-400 flex items-center gap-1"
      >
        <Users size={12} />
        Waitlist ({open ? entries.length : '…'})
      </button>

      {open && (
        <div className="mt-2 bg-black/30 border border-white/10 rounded-xl p-3 space-y-2">
          <p className="text-xs text-white/40">{className} waitlist</p>
          {loading ? (
            <p className="text-xs text-white/20">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-white/20">No one on the waitlist.</p>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="flex justify-between items-center text-xs">
                <span className="text-white/70">
                  #{e.position}{' '}
                  {e.members
                    ? `${e.members.first_name} ${e.members.last_name}`
                    : 'Member'}
                </span>
                <button
                  onClick={() => void handleRemove(e.id)}
                  className="text-white/20 hover:text-red-400"
                >
                  Remove
                </button>
              </div>
            ))
          )}
          <div className="flex gap-2 pt-1">
            <select
              value={memberId}
              onChange={(ev) => setMemberId(ev.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
            >
              <option value="" className="bg-gray-900">
                Add member...
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id} className="bg-gray-900">
                  {m.first_name} {m.last_name}
                </option>
              ))}
            </select>
            <button
              onClick={() => void handleAdd()}
              disabled={submitting || !memberId}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Pin, Trash2 } from 'lucide-react';
import {
  createMemberNoteAction,
  deleteMemberNoteAction,
  listMemberNotesAction,
  toggleMemberNotePinAction,
} from '@/app/(dashboard)/actions';
import type { CrmNote } from '@/services/crm-notes';

const NOTE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'call', label: 'Phone call' },
  { value: 'email', label: 'Email' },
  { value: 'in_person', label: 'In person' },
] as const;

type Props = { memberId: string };

export default function MemberNotesPanel({ memberId }: Props) {
  const [notes, setNotes] = useState<CrmNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [noteType, setNoteType] = useState<(typeof NOTE_TYPES)[number]['value']>('general');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const result = await listMemberNotesAction(memberId);
    if (result.ok && result.data) setNotes(result.data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [memberId]);

  const handleAdd = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    const result = await createMemberNoteAction({ memberId, body, noteType });
    setSubmitting(false);
    if (result.ok && result.data) {
      setNotes((prev) => [result.data!, ...prev]);
      setBody('');
    }
  };

  const handleDelete = async (noteId: string) => {
    const result = await deleteMemberNoteAction(memberId, noteId);
    if (result.ok) setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handlePin = async (noteId: string, isPinned: boolean) => {
    const result = await toggleMemberNotePinAction(memberId, noteId, !isPinned);
    if (result.ok) {
      setNotes((prev) =>
        prev
          .map((n) => (n.id === noteId ? { ...n, is_pinned: !isPinned } : n))
          .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))
      );
    }
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) return <p className="text-white/30 text-sm py-8 text-center">Loading notes...</p>;

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note about this member..."
          rows={3}
          className={inputClass}
        />
        <div className="flex gap-3">
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value as typeof noteType)}
            className={`${inputClass} w-auto`}
          >
            {NOTE_TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-gray-900">
                {t.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => void handleAdd()}
            disabled={submitting || !body.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition"
          >
            {submitting ? 'Saving...' : 'Add Note'}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-8">No notes yet.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`rounded-xl px-4 py-3 border ${
                note.is_pinned ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs text-white/30 capitalize">{note.note_type.replace('_', ' ')}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => void handlePin(note.id, note.is_pinned)}
                    className={`p-1 rounded ${note.is_pinned ? 'text-blue-400' : 'text-white/20 hover:text-white/50'}`}
                    title={note.is_pinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin size={14} />
                  </button>
                  <button
                    onClick={() => void handleDelete(note.id)}
                    className="p-1 text-white/20 hover:text-red-400 rounded"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-white text-sm mt-2 whitespace-pre-wrap">{note.body}</p>
              <p className="text-white/20 text-xs mt-2">
                {new Date(note.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

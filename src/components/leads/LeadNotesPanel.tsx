'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import { Pin, Trash2 } from 'lucide-react';
import {
  createLeadNoteAction,
  deleteLeadNoteAction,
  listLeadNotesAction,
  toggleLeadNotePinAction,
} from '@/app/(dashboard)/actions';
import type { CrmNote } from '@/services/crm-notes';

const NOTE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'call', label: 'Phone call' },
  { value: 'email', label: 'Email' },
  { value: 'in_person', label: 'In person' },
] as const;

type Props = { leadId: string };

export default function LeadNotesPanel({ leadId }: Props) {
  const [notes, setNotes] = useState<CrmNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [noteType, setNoteType] = useState<(typeof NOTE_TYPES)[number]['value']>('general');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const result = await listLeadNotesAction(leadId);
    if (result.ok && result.data) setNotes(result.data);
    setLoading(false);
  };

  useAsyncMount(load, [leadId]);

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) return <p className="text-white/30 text-xs py-2">Loading activity notes...</p>;

  return (
    <div className="space-y-3 border-t border-white/5 pt-3">
      <p className="text-white/40 text-xs font-medium uppercase tracking-wide">Activity notes</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Log a call, email, or follow-up..."
        rows={2}
        className={inputClass}
      />
      <div className="flex gap-2">
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
          type="button"
          onClick={async () => {
            if (!body.trim()) return;
            setSubmitting(true);
            const result = await createLeadNoteAction({ leadId, body, noteType });
            setSubmitting(false);
            if (result.ok && result.data) {
              setNotes((prev) => [result.data!, ...prev]);
              setBody('');
            }
          }}
          disabled={submitting || !body.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-xl"
        >
          {submitting ? 'Saving...' : 'Add activity note'}
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="text-white/25 text-xs">No activity notes yet.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`rounded-xl px-3 py-2 border text-sm ${
                note.is_pinned ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs text-white/30 capitalize">{note.note_type.replace('_', ' ')}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await toggleLeadNotePinAction(leadId, note.id, !note.is_pinned);
                      if (result.ok) {
                        setNotes((prev) =>
                          prev
                            .map((n) => (n.id === note.id ? { ...n, is_pinned: !note.is_pinned } : n))
                            .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))
                        );
                      }
                    }}
                    className={`p-1 rounded ${note.is_pinned ? 'text-blue-400' : 'text-white/20 hover:text-white/50'}`}
                  >
                    <Pin size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await deleteLeadNoteAction(leadId, note.id);
                      if (result.ok) setNotes((prev) => prev.filter((n) => n.id !== note.id));
                    }}
                    className="p-1 text-white/20 hover:text-red-400 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <p className="text-white/80 text-xs mt-1 whitespace-pre-wrap">{note.body}</p>
              <p className="text-white/20 text-[10px] mt-1">{new Date(note.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

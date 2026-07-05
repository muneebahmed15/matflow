'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StickyNote } from 'lucide-react';
import { searchCrmNotesAction } from '@/app/(dashboard)/actions';

type NoteResult = {
  id: string;
  body: string;
  note_type: string;
  is_pinned: boolean;
  created_at: string;
  member_id: string | null;
  lead_id: string | null;
  member_name: string | null;
  lead_name: string | null;
};

export default function NotesSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    const res = await searchCrmNotesAction(q);
    if (res.ok && res.data) setResults(res.data);
    else setResults([]);
    setLoading(false);
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">CRM Notes</h1>
      <p className="text-white/40 text-sm mb-8">Search notes across all members and leads.</p>

      <div className="flex gap-2 mb-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void search();
          }}
          placeholder="Search note text…"
          className={inputClass}
        />
        <button
          onClick={() => void search()}
          disabled={loading || !query.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm whitespace-nowrap"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {loading ? (
        <p className="text-white/30 text-sm">Searching…</p>
      ) : results.length === 0 && searched ? (
        <div className="text-center py-12 text-white/30">
          <StickyNote size={40} className="mx-auto mb-3 opacity-30" />
          No notes match your search.
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((note) => (
            <div key={note.id} className="bg-[#111] border border-white/10 rounded-2xl p-4">
              <p className="text-white text-sm whitespace-pre-wrap">{note.body}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-white/40">
                <span className="capitalize">{note.note_type.replace('_', ' ')}</span>
                <span>·</span>
                <span>{new Date(note.created_at).toLocaleString()}</span>
                {note.is_pinned && (
                  <span className="text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">Pinned</span>
                )}
              </div>
              {(note.member_id || note.lead_id) && (
                <div className="mt-2">
                  {note.member_id && note.member_name && (
                    <Link href={`/members/${note.member_id}`} className="text-blue-400 text-sm hover:underline">
                      {note.member_name}
                    </Link>
                  )}
                  {note.lead_id && note.lead_name && (
                    <Link href={`/leads`} className="text-blue-400 text-sm hover:underline">
                      Lead: {note.lead_name}
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

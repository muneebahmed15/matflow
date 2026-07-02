'use client';

import { useState } from 'react';

type Props = { gymId: string };

export default function ReviewSubmitForm({ gymId }: Props) {
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!authorName.trim()) return;
    setLoading(true);
    const res = await fetch('/api/public/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gym_id: gymId, author_name: authorName, rating, body }),
    });
    setLoading(false);
    if (res.ok) {
      setSent(true);
      setAuthorName('');
      setBody('');
    }
  };

  if (sent) {
    return <p className="text-green-400 text-sm">Thank you for your review!</p>;
  }

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
      <h2 className="font-semibold text-white">Leave a Review</h2>
      <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Your name" className={inputClass} />
      <div>
        <label className="text-white/40 text-xs">Rating</label>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className={inputClass}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n} className="bg-gray-900">
              {n} stars
            </option>
          ))}
        </select>
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your experience (optional)" rows={3} className={inputClass} />
      <button
        onClick={() => void submit()}
        disabled={loading || !authorName.trim()}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  );
}

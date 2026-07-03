'use client';

import { useState } from 'react';

type Props = { gymSlug: string; accent: string };

export default function NewsletterSignup({ gymSlug, accent }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    const res = await fetch('/api/public/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gym_slug: gymSlug, email: email.trim() }),
    });
    setStatus(res.ok ? 'done' : 'error');
  };

  if (status === 'done') {
    return <p className="text-green-400 text-sm">Subscribed! Watch your inbox.</p>;
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        required
        className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 shrink-0"
        style={{ backgroundColor: accent }}
      >
        {status === 'sending' ? '...' : 'Subscribe'}
      </button>
      {status === 'error' && <p className="text-red-400 text-xs self-center">Failed. Try again.</p>}
    </form>
  );
}

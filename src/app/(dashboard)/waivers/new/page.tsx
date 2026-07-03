'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWaiverAction } from '@/app/(dashboard)/actions';
import { WAIVER_TEMPLATES } from '@/lib/waiver-templates';

const DEFAULT_BODY = `I, the undersigned, acknowledge and agree to the following:

1. ASSUMPTION OF RISK: I understand that martial arts training involves physical contact and the risk of injury. I voluntarily assume all risks associated with participation.

2. RELEASE OF LIABILITY: I release [Your Gym Name], its owners, coaches, and staff from any and all liability for injuries sustained during training.

3. MEDICAL AUTHORIZATION: I confirm that I am in good physical health and have no medical conditions that would prevent safe participation.

4. PHOTO/VIDEO CONSENT: I grant permission to use my image in promotional materials related to the gym.

5. GYM RULES: I agree to follow all gym rules and the direction of coaches at all times.`;

export default function NewWaiverPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState(DEFAULT_BODY);
  const [expiresAfterDays, setExpiresAfterDays] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await createWaiverAction({
      title: title.trim(),
      body: body.trim(),
      expiresAfterDays: expiresAfterDays ? parseInt(expiresAfterDays, 10) : undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push('/waivers');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1">
          ← Back
        </button>
        <h1 className="text-2xl font-bold mb-2">Create Waiver</h1>
        <p className="text-gray-400 text-sm mb-8">This waiver will be available for members to sign digitally.</p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Start from a template</label>
            <div className="flex flex-wrap gap-2">
              {WAIVER_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setTitle(t.title); setBody(t.body); }}
                  className="text-xs border border-white/10 text-white/60 hover:text-white hover:bg-white/5 px-3 py-1.5 rounded-lg transition"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-white/20 text-xs mt-1">
              Templates support merge fields: {'{{member_name}}'}, {'{{gym_name}}'}, {'{{date}}'}.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Waiver Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. General Liability Waiver 2025"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Waiver Text</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Expires after (days, optional)</label>
            <input
              type="number"
              min={1}
              value={expiresAfterDays}
              onChange={(e) => setExpiresAfterDays(e.target.value)}
              placeholder="e.g. 365"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Creating…' : 'Create Waiver'}
          </button>
        </div>
      </div>
    </div>
  );
}
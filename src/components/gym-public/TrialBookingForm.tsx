'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { gymPrimaryColor } from '@/lib/gym-public';
import type { PublicGymProfile } from '@/lib/gym-public';

type Props = { gym: PublicGymProfile };

function getUtmParams(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') ?? undefined,
    utm_medium: params.get('utm_medium') ?? undefined,
    utm_campaign: params.get('utm_campaign') ?? undefined,
  };
}

export default function TrialBookingForm({ gym }: Props) {
  const accent = gymPrimaryColor(gym.primary_color);
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // Pre-filled from ?class= when arriving from the schedule page
  const [interestedIn, setInterestedIn] = useState(() => searchParams.get('class') ?? '');
  const [smsConsent, setSmsConsent] = useState(false);
  const [trialDate, setTrialDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (smsConsent && !phone.trim()) {
      setError('Phone number is required for SMS updates.');
      return;
    }
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/public/trial-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gym_slug: gym.slug,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        interested_in: interestedIn.trim() || undefined,
        sms_consent: smsConsent,
        trial_date: trialDate || undefined,
        ...getUtmParams(),
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || 'Something went wrong. Please try again.');
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
        <p className="text-green-400 font-semibold text-lg">You&apos;re booked!</p>
        <p className="text-green-400/70 text-sm mt-2">
          Thanks, {firstName}! {gym.name} will contact you shortly to confirm your free trial.
        </p>
        <Link
          href={`/g/${gym.slug}`}
          className="inline-block mt-6 text-sm text-white/50 hover:text-white"
        >
          ← Back to {gym.name}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#111] border border-white/10 rounded-2xl p-8 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-white/50 mb-1">First name *</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-white/50 mb-1">Last name *</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-white/50 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm text-white/50 mb-1">Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm text-white/50 mb-1">Preferred trial date</label>
        <input
          type="date"
          value={trialDate}
          onChange={(e) => setTrialDate(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm text-white/50 mb-1">Interested in</label>
        <input
          value={interestedIn}
          onChange={(e) => setInterestedIn(e.target.value)}
          placeholder="e.g. BJJ, Kids MMA, Muay Thai"
          className={inputClass}
        />
      </div>
      <label className="flex items-start gap-3 text-sm text-white/60 cursor-pointer">
        <input
          type="checkbox"
          checked={smsConsent}
          onChange={(e) => setSmsConsent(e.target.checked)}
          className="mt-1"
        />
        <span>
          I agree to receive SMS updates about my trial. Message and data rates may apply. Reply STOP to opt out.
        </span>
      </label>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
        style={{ backgroundColor: accent }}
      >
        {submitting ? 'Submitting...' : 'Book My Free Trial'}
      </button>
    </form>
  );
}

export function TrialBookingPageClient({ gym }: Props) {
  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-2">Book a Free Trial</h1>
      <p className="text-white/40 text-sm mb-8">
        Try a class at {gym.name} — no commitment required.
      </p>
      <Suspense fallback={null}>
        <TrialBookingForm gym={gym} />
      </Suspense>
    </div>
  );
}


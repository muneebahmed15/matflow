'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { gymPrimaryColor } from '@/lib/gym-public';
import type { PublicGymProfile } from '@/lib/gym-public';

type Props = { gym: PublicGymProfile };

type ActiveWaiver = { id: string; title: string; body: string };

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
  const [interestedIn, setInterestedIn] = useState(() => searchParams.get('class') ?? '');
  const [smsConsent, setSmsConsent] = useState(false);
  const [trialDate, setTrialDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [waivers, setWaivers] = useState<ActiveWaiver[]>([]);
  const [waiverIndex, setWaiverIndex] = useState(0);
  const [signedName, setSignedName] = useState('');
  const [waiverComplete, setWaiverComplete] = useState(false);

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
    if (!res.ok) {
      setSubmitting(false);
      setError(data.error || 'Something went wrong. Please try again.');
      return;
    }

    setLeadId(data.lead_id);
    setSignedName(`${firstName.trim()} ${lastName.trim()}`);

    const waiverRes = await fetch(`/api/public/trial-waivers?gym_slug=${encodeURIComponent(gym.slug)}`);
    const waiverData = await waiverRes.json();
    const activeWaivers: ActiveWaiver[] = waiverRes.ok ? (waiverData.waivers ?? []) : [];

    setSubmitting(false);

    if (activeWaivers.length === 0) {
      setWaiverComplete(true);
    } else {
      setWaivers(activeWaivers);
    }
  };

  const signCurrentWaiver = async () => {
    if (!leadId || !signedName.trim()) {
      setError('Please type your full name to sign.');
      return;
    }
    const waiver = waivers[waiverIndex];
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/public/trial-waiver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gym_slug: gym.slug,
        lead_id: leadId,
        waiver_id: waiver.id,
        signed_name: signedName.trim(),
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || 'Could not sign waiver. Please try again.');
      return;
    }

    if (waiverIndex + 1 >= waivers.length) {
      setWaiverComplete(true);
    } else {
      setWaiverIndex((i) => i + 1);
    }
  };

  if (waiverComplete) {
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

  if (leadId && waivers.length > 0) {
    const waiver = waivers[waiverIndex];
    return (
      <div className="bg-[#111] border border-white/10 rounded-2xl p-8 space-y-4">
        <p className="text-white/50 text-sm">
          Step 2 of 2 — Sign waiver {waiverIndex + 1} of {waivers.length}
        </p>
        <h2 className="text-xl font-bold text-white">{waiver.title}</h2>
        <div className="bg-black/30 rounded-xl p-4 max-h-48 overflow-y-auto text-sm text-white/70 whitespace-pre-wrap">
          {waiver.body}
        </div>
        <div>
          <label className="block text-sm text-white/50 mb-1">Type your full name to sign *</label>
          <input value={signedName} onChange={(e) => setSignedName(e.target.value)} className={inputClass} />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="button"
          onClick={() => void signCurrentWaiver()}
          disabled={submitting}
          className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          {submitting ? 'Signing...' : 'I Agree & Sign'}
        </button>
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

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { SpringButton } from '@/components/SpringButton';
import { updateGymSettingsAction, getGymSettingsAction } from '@/app/(dashboard)/actions';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Pacific/Honolulu',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [gymName, setGymName] = useState('');
  const [gymSlug, setGymSlug] = useState('');
  const [kioskEnabled, setKioskEnabled] = useState(false);
  const [timezone, setTimezone] = useState('America/New_York');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError('');

      const onboardRes = await fetch('/api/gym/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (onboardRes.status === 409) {
        const settings = await getGymSettingsAction();
        if (settings.ok && settings.data) {
          setGymName(settings.data.name);
          setGymSlug(settings.data.slug);
          setKioskEnabled(settings.data.kiosk_enabled);
          setTimezone(settings.data.timezone ?? 'America/New_York');
        }
        setLoading(false);
        return;
      }

      if (!onboardRes.ok) {
        const body = (await onboardRes.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Could not set up your gym. Please try again.');
        setLoading(false);
        return;
      }

      const body = (await onboardRes.json()) as { gym?: { name?: string; slug?: string } };
      if (body.gym?.name) setGymName(body.gym.name);
      if (body.gym?.slug) setGymSlug(body.gym.slug);
      setLoading(false);
    })();
  }, []);

  const handleContinue = async () => {
    setSaving(true);
    setError('');

    if (gymName.trim() && gymSlug) {
      const settings = await updateGymSettingsAction({
        name: gymName.trim(),
        slug: gymSlug,
        kioskEnabled,
        timezone,
      });
      if (!settings.ok) {
        setError(settings.error);
        setSaving(false);
        return;
      }
    }

    router.push('/setup');
    setSaving(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/40">Setting up your gym...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Logo size={32} />
          <span className="font-bold text-xl">MatsFlow</span>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-2">Welcome to MatsFlow</h1>
          <p className="text-white/50 text-sm mb-6">
            Let&apos;s configure your gym. You can change these later in Settings.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Gym name</label>
              <input
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                placeholder="East Coast MMA"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz} className="bg-gray-900">
                    {tz.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <SpringButton
              type="button"
              onClick={() => void handleContinue()}
              disabled={saving || !gymName.trim()}
              size="lg"
              className="w-full"
            >
              {saving ? 'Saving...' : 'Continue to dashboard'}
            </SpringButton>
          </div>
        </div>
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { SpringButton } from '@/components/SpringButton';
import {
  completeSetupAction,
  getGymSettingsAction,
  updateGymSettingsAction,
} from '@/app/(dashboard)/actions';

const STEPS = [
  { id: 'contact', title: 'Contact info', description: 'Help members and leads reach you.' },
  { id: 'website', title: 'Public website', description: 'Launch your gym site and trial booking.' },
  { id: 'essentials', title: 'Essentials', description: 'Add classes, waivers, and your first member.' },
] as const;

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [slug, setSlug] = useState('');
  const [kioskEnabled, setKioskEnabled] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZip, setAddressZip] = useState('');
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [websiteEnabled, setWebsiteEnabled] = useState(false);

  useEffect(() => {
    void (async () => {
      const settings = await getGymSettingsAction();
      if (!settings.ok || !settings.data) {
        router.push('/onboarding');
        return;
      }
      if (settings.data.setup_completed_at) {
        router.push('/dashboard');
        return;
      }
      setName(settings.data.name);
      setSlug(settings.data.slug);
      setKioskEnabled(settings.data.kiosk_enabled);
      setContactEmail(settings.data.contact_email ?? '');
      setContactPhone(settings.data.contact_phone ?? '');
      setAddressLine1(settings.data.address_line1 ?? '');
      setAddressCity(settings.data.address_city ?? '');
      setAddressState(settings.data.address_state ?? '');
      setAddressZip(settings.data.address_zip ?? '');
      setTagline(settings.data.tagline ?? '');
      setWebsiteEnabled(settings.data.website_enabled);
      setLoading(false);
    })();
  }, [router]);

  const persistSettings = async (extra?: { websiteEnabled?: boolean }) => {
    return updateGymSettingsAction({
      name,
      slug,
      kioskEnabled,
      contactEmail,
      contactPhone,
      addressLine1,
      addressCity,
      addressState,
      addressZip,
      tagline,
      websiteEnabled: extra?.websiteEnabled ?? websiteEnabled,
    });
  };

  const handleNext = async () => {
    setSaving(true);
    setError('');
    const result = await persistSettings();
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setSaving(false);
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    const saved = await persistSettings({ websiteEnabled: true });
    if (!saved.ok) {
      setError(saved.error);
      setSaving(false);
      return;
    }
    const done = await completeSetupAction();
    setSaving(false);
    if (!done.ok) {
      setError(done.error);
      return;
    }
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/40">Loading setup...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Logo size={32} />
          <span className="font-bold text-xl">MatsFlow Setup</span>
        </div>

        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-blue-500' : 'bg-white/10'}`}
            />
          ))}
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-1">{STEPS[step].title}</h1>
          <p className="text-white/50 text-sm mb-6">{STEPS[step].description}</p>

          {step === 0 && (
            <div className="space-y-4">
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Contact email"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
              />
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Phone"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
              />
              <input
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Street address"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="City"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                />
                <input
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  placeholder="State"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                />
                <input
                  value={addressZip}
                  onChange={(e) => setAddressZip(e.target.value)}
                  placeholder="ZIP"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Tagline (e.g. Train hard. Stay humble.)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
              />
              <label className="flex items-center gap-3 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={websiteEnabled}
                  onChange={(e) => setWebsiteEnabled(e.target.checked)}
                  className="rounded"
                />
                Enable public website at /g/{slug}
              </label>
              {websiteEnabled && slug && (
                <p className="text-xs text-blue-400">
                  Preview:{' '}
                  <Link href={`/g/${slug}`} className="underline" target="_blank">
                    /g/{slug}
                  </Link>
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 text-sm">
              <p className="text-white/60">Complete these before your first check-in:</p>
              <Link href="/classes" className="block rounded-xl border border-white/10 px-4 py-3 hover:bg-white/5">
                Add your class schedule →
              </Link>
              <Link href="/waivers" className="block rounded-xl border border-white/10 px-4 py-3 hover:bg-white/5">
                Create a liability waiver →
              </Link>
              <Link href="/members/new" className="block rounded-xl border border-white/10 px-4 py-3 hover:bg-white/5">
                Add your first member →
              </Link>
              <Link href="/plans" className="block rounded-xl border border-white/10 px-4 py-3 hover:bg-white/5">
                Set up membership plans (optional) →
              </Link>
            </div>
          )}

          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-xl border border-white/10 text-white/60"
              >
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <SpringButton
                type="button"
                onClick={() => void handleNext()}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Continue'}
              </SpringButton>
            ) : (
              <SpringButton
                type="button"
                onClick={() => void handleFinish()}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Finishing...' : 'Finish setup'}
              </SpringButton>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

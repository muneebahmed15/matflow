'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, User } from 'lucide-react';
import Logo from '@/components/Logo';
import type { UserPersonas } from '@/lib/auth/resolve-persona';

export default function SelectPersonaPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<UserPersonas | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'staff' | 'member' | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/auth/personas');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = (await res.json()) as UserPersonas;
      if (!data.hasStaff && !data.hasMember) {
        router.push('/login');
        return;
      }
      if (data.hasStaff && !data.hasMember) {
        router.push('/dashboard');
        return;
      }
      if (!data.hasStaff && data.hasMember) {
        router.push('/portal');
        return;
      }
      setPersonas(data);
      setLoading(false);
    })();
  }, [router]);

  const choose = async (surface: 'staff' | 'member') => {
    setBusy(surface);
    const res = await fetch('/api/auth/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surface }),
    });
    if (!res.ok) {
      setBusy(null);
      return;
    }
    router.push(surface === 'staff' ? '/dashboard' : '/portal');
  };

  if (loading || !personas) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white/40">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Logo size={32} />
            <span className="font-bold text-xl">MatsFlow</span>
          </div>
          <h1 className="text-2xl font-bold">Choose how to continue</h1>
          <p className="text-white/40 text-sm mt-2">
            Your account has both staff and member access.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void choose('staff')}
            className="bg-[#111] border border-white/10 hover:border-blue-500/40 rounded-2xl p-6 text-left transition disabled:opacity-50"
          >
            <LayoutDashboard className="text-blue-400 mb-3" size={28} />
            <p className="font-semibold">Staff dashboard</p>
            <p className="text-white/40 text-xs mt-1">Manage members, classes, and gym operations</p>
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void choose('member')}
            className="bg-[#111] border border-white/10 hover:border-green-500/40 rounded-2xl p-6 text-left transition disabled:opacity-50"
          >
            <User className="text-green-400 mb-3" size={28} />
            <p className="font-semibold">Member portal</p>
            <p className="text-white/40 text-xs mt-1">View attendance, billing, and your profile</p>
          </button>
        </div>
      </div>
    </div>
  );
}

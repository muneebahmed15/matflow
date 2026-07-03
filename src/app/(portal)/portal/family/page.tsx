'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePortalMember } from '@/lib/portal-member-context';
import { ListSkeleton } from '@/components/LoadingSkeleton';

type FamilyBilling = {
  family: { family_name: string; primary_email: string | null };
  members: { first_name: string; last_name: string; status: string }[];
  subscriptions: { status: string; plans: { name: string } | null }[];
};

export default function PortalFamilyPage() {
  const { activeMember, familyMembers, setActiveMemberId } = usePortalMember();
  const [billing, setBilling] = useState<FamilyBilling | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/portal/family');
      const data = await res.json();
      if (data.billing) setBilling(data.billing);
      setLoading(false);
    })();
  }, []);

  if (loading) return <ListSkeleton count={3} />;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal" className="text-sm text-gray-400 hover:text-white">← Back</Link>
        <h1 className="text-2xl font-bold mt-2">Family</h1>
        <p className="text-white/40 text-sm mt-1">Switch profiles and view shared billing.</p>
      </div>

      <div className="space-y-2">
        {familyMembers.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveMemberId(m.id)}
            className={`w-full text-left bg-[#111] border rounded-2xl px-4 py-3 flex justify-between items-center ${
              activeMember?.id === m.id ? 'border-blue-500/50' : 'border-white/10'
            }`}
          >
            <div>
              <p className="font-medium text-white">
                {m.first_name} {m.last_name}
              </p>
              <p className="text-white/30 text-xs capitalize">{m.belt_rank} belt · {m.status}</p>
            </div>
            {activeMember?.id === m.id && (
              <span className="text-xs text-blue-400">Active</span>
            )}
          </button>
        ))}
      </div>

      {billing && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-white">{billing.family.family_name}</h2>
          {billing.subscriptions.map((sub, i) => (
            <p key={i} className="text-sm text-white/60">
              {sub.plans?.name ?? 'Plan'} — <span className="capitalize">{sub.status}</span>
            </p>
          ))}
          <p className="text-white/30 text-xs">{billing.members.length} family members on file</p>
        </div>
      )}
    </div>
  );
}

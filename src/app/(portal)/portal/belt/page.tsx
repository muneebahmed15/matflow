'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getBeltProgress } from '@/lib/belt-progress';
import { usePortalMember } from '@/lib/portal-member-context';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import { Award } from 'lucide-react';

type Promotion = {
  id: string;
  from_belt: string;
  to_belt: string;
  notes: string | null;
  promoted_at: string;
};

export default function PortalBeltPage() {
  const { activeMember, loading: memberLoading } = usePortalMember();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeMember) return;
    void (async () => {
      const { data: promos } = await supabase
        .from('belt_promotions')
        .select('id, from_belt, to_belt, notes, promoted_at')
        .eq('member_id', activeMember.id)
        .order('promoted_at', { ascending: false });

      setPromotions((promos as Promotion[]) ?? []);
      setLoading(false);
    })();
  }, [activeMember]);

  if (memberLoading || loading || !activeMember) {
    return <ListSkeleton count={4} />;
  }

  const beltRank = activeMember.belt_rank ?? 'white';
  const stripeCount = activeMember.stripe_count ?? 0;
  const progress = getBeltProgress(beltRank, stripeCount);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal" className="text-sm text-gray-400 hover:text-white">← Back</Link>
        <h1 className="text-2xl font-bold mt-2">My Belt Progress</h1>
        <p className="text-white/40 text-sm mt-1">
          {activeMember.first_name} {activeMember.last_name}
        </p>
      </div>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Current Rank</p>
        <p className="text-3xl font-extrabold capitalize text-white">{beltRank} belt</p>
        {stripeCount > 0 && (
          <p className="text-white/50 text-sm mt-2">{stripeCount} stripe{stripeCount === 1 ? '' : 's'}</p>
        )}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>Overall progress</span>
            <span>{progress.progressPercent}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
          {progress.nextBelt && progress.stripesUntilPromotion > 0 && (
            <p className="text-white/40 text-xs mt-2">
              {progress.stripesUntilPromotion} stripe{progress.stripesUntilPromotion === 1 ? '' : 's'} until {progress.nextBelt} belt
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-white mb-3">Promotion History</h2>
        {promotions.length === 0 ? (
          <PortalEmptyState
            icon={Award}
            title="No promotions yet"
            description="Your coach will record belt promotions here as you progress. Keep showing up!"
            actionLabel="View class schedule"
            actionHref="/portal/classes"
          />
        ) : (
          <div className="space-y-2">
            {promotions.map((p) => (
              <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-white text-sm font-medium capitalize">
                  {p.from_belt} → {p.to_belt}
                </p>
                <p className="text-white/30 text-xs mt-0.5">
                  {new Date(p.promoted_at).toLocaleDateString()}
                </p>
                {p.notes && <p className="text-white/50 text-xs mt-1">{p.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

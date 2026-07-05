'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import { getBusinessInsightsAction, refreshBusinessSnapshotAction, markDigestActionDoneAction, snoozeDigestActionAction } from '@/app/(dashboard)/actions';
import Link from 'next/link';
import { StatsSkeleton } from '@/components/LoadingSkeleton';

export default function BusinessInsightsWidget() {
  const [data, setData] = useState<{
    metrics?: Record<string, number>;
    recommendations?: {
      priority: string;
      title: string;
      description: string;
      actionHref?: string;
      actionKey?: string;
      draftEmail?: string;
    }[];
    marketingTip?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const result = await getBusinessInsightsAction();
    if (result.ok && result.data) setData(result.data as typeof data);
    setLoading(false);
  };

  useAsyncMount(load, []);

  const refresh = async () => {
    setLoading(true);
    await refreshBusinessSnapshotAction();
    await load();
  };

  if (loading) return <StatsSkeleton />;
  if (!data) return null;

  const metrics = data.metrics ?? {};
  const recs = data.recommendations ?? [];

  const metricCards = [
    { label: 'New leads (7d)', value: metrics.newLeads7d ?? 0 },
    { label: 'Past due', value: metrics.pastDueMembers ?? 0 },
    { label: 'Inactive 14d', value: metrics.inactiveMembers14d ?? 0 },
    { label: 'Ready to promote', value: metrics.readyForPromotion ?? 0 },
    { label: 'Waiver gaps', value: metrics.waiverGapMembers ?? 0 },
    { label: 'Low-attendance classes', value: metrics.lowAttendanceClasses ?? 0 },
    { label: 'Open trial leads', value: metrics.trialLeadsOpen ?? 0 },
    { label: 'Escalated chats', value: metrics.escalationQueueSize ?? 0 },
    { label: 'Lead conv. (7d)', value: metrics.leadConversionRate7d ?? 0 },
  ];

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-white">Today&apos;s Actions</h2>
        <button onClick={() => void refresh()} className="text-xs text-blue-400 hover:underline">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {metricCards.map((m) => (
          <div key={m.label} className="bg-white/5 rounded-xl p-3">
            <p className="text-2xl font-bold text-white">{m.value}</p>
            <p className="text-white/30 text-xs">{m.label}</p>
          </div>
        ))}
      </div>

      {recs.length === 0 ? (
        <p className="text-white/30 text-sm">All clear — no urgent actions today.</p>
      ) : (
        <div className="space-y-2">
          {recs.map((r, i) => (
            <div key={i} className="flex gap-3 bg-white/5 rounded-xl px-4 py-3">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded h-fit ${
                  r.priority === 'P1' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}
              >
                {r.priority}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{r.title}</p>
                <p className="text-white/40 text-xs mt-0.5">{r.description}</p>
                {r.draftEmail && (
                  <p className="text-white/30 text-xs mt-1 italic truncate">Draft: {r.draftEmail}</p>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {r.actionHref && (
                  <Link href={r.actionHref} className="text-xs text-blue-400 hover:underline">
                    Go →
                  </Link>
                )}
                {r.actionKey && (
                  <>
                    <button
                      type="button"
                      onClick={() => void markDigestActionDoneAction(r.actionKey!).then(() => load())}
                      className="text-xs text-green-400 hover:underline"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={() => void snoozeDigestActionAction(r.actionKey!, 3).then(() => load())}
                      className="text-xs text-white/40 hover:underline"
                    >
                      Snooze
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {data.marketingTip && (
        <p className="text-white/40 text-xs mt-4 border-t border-white/10 pt-3">
          Tip: {data.marketingTip}
        </p>
      )}

      <Link href="/insights" className="inline-block mt-4 text-xs text-white/40 hover:text-white">
        View full insights →
      </Link>
    </div>
  );
}

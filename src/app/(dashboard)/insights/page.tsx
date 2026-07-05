'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import BusinessInsightsWidget from '@/components/dashboard/BusinessInsightsWidget';
import { StatsSkeleton } from '@/components/LoadingSkeleton';
import { listDigestHistoryAction } from '@/app/(dashboard)/actions';

type HistoryRow = {
  snapshot_date: string;
  metrics?: Record<string, number>;
  recommendations?: { priority: string; title: string }[];
};

export default function InsightsPage() {
  const [tab, setTab] = useState<'today' | 'history'>('today');
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const res = await listDigestHistoryAction();
    if (res.ok && res.data) setHistory(res.data as HistoryRow[]);
    setHistoryLoading(false);
  };

  useAsyncMount(() => {
    if (tab === 'history') void loadHistory();
  }, [tab]);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Business Insights</h1>
      <p className="text-white/40 text-sm mb-6">Daily summary and recommended actions for your gym.</p>

      <div className="flex gap-2 mb-6">
        {(['today', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'
            }`}
          >
            {t === 'today' ? 'Today' : 'History'}
          </button>
        ))}
      </div>

      {tab === 'today' ? (
        <BusinessInsightsWidget />
      ) : historyLoading ? (
        <StatsSkeleton />
      ) : history.length === 0 ? (
        <p className="text-white/30 text-sm">No saved digests yet. Enable daily digest in Settings.</p>
      ) : (
        <div className="space-y-3">
          {history.map((row) => (
            <div key={row.snapshot_date} className="bg-[#111] border border-white/10 rounded-2xl p-5">
              <p className="text-white font-medium mb-2">{row.snapshot_date}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {Object.entries(row.metrics ?? {})
                  .slice(0, 4)
                  .map(([key, value]) => (
                    <div key={key} className="bg-white/5 rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-white">{value}</p>
                      <p className="text-white/30 text-[10px] uppercase">{key.replace(/([A-Z])/g, ' $1')}</p>
                    </div>
                  ))}
              </div>
              {(row.recommendations ?? []).length > 0 ? (
                <ul className="text-white/50 text-xs space-y-1">
                  {row.recommendations!.slice(0, 3).map((r, i) => (
                    <li key={i}>
                      [{r.priority}] {r.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white/30 text-xs">No actions recorded</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

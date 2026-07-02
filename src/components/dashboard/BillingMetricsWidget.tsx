'use client';

import { useEffect, useState } from 'react';
import { getBillingMetricsAction } from '@/app/(dashboard)/actions';
import Link from 'next/link';

export default function BillingMetricsWidget() {
  const [metrics, setMetrics] = useState<{
    mrrCents: number;
    activeSubscriptions: number;
    pastDueSubscriptions: number;
    familyCount: number;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await getBillingMetricsAction();
      if (res.ok && res.data) setMetrics(res.data);
    })();
  }, []);

  if (!metrics) return null;

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-white">Revenue</h2>
        <Link href="/subscriptions" className="text-xs text-blue-400 hover:underline">
          Subscriptions →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-2xl font-bold text-green-400">
            ${(metrics.mrrCents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </p>
          <p className="text-white/30 text-xs">Est. MRR</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-2xl font-bold text-white">{metrics.activeSubscriptions}</p>
          <p className="text-white/30 text-xs">Active subs</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-2xl font-bold text-yellow-400">{metrics.pastDueSubscriptions}</p>
          <p className="text-white/30 text-xs">Past due</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-2xl font-bold text-white">{metrics.familyCount}</p>
          <p className="text-white/30 text-xs">Families</p>
        </div>
      </div>
    </div>
  );
}

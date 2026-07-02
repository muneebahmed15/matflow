'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, FileText } from 'lucide-react';
import { getWaiverComplianceAction } from '@/app/(dashboard)/actions';
import type { MemberWaiverGap } from '@/services/waivers';

export default function WaiverComplianceWidget() {
  const [gaps, setGaps] = useState<MemberWaiverGap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const result = await getWaiverComplianceAction();
      if (result.ok && result.data) setGaps(result.data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#111] border border-white/10 rounded-2xl p-5 animate-pulse h-40" />
    );
  }

  if (gaps.length === 0) {
    return (
      <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
          <FileText size={16} />
          All active members have valid waivers
        </div>
      </div>
    );
  }

  const missingTotal = gaps.reduce(
    (sum, g) => sum + g.issues.filter((i) => i.status === 'missing').length,
    0
  );
  const expiredTotal = gaps.reduce(
    (sum, g) => sum + g.issues.filter((i) => i.status === 'expired').length,
    0
  );

  return (
    <div className="bg-amber-500/5 border border-amber-500/25 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-amber-300 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle size={16} />
            Waiver compliance
          </p>
          <p className="text-white/40 text-xs mt-1">
            {gaps.length} member{gaps.length === 1 ? '' : 's'} need attention
            {missingTotal > 0 ? ` · ${missingTotal} unsigned` : ''}
            {expiredTotal > 0 ? ` · ${expiredTotal} expired` : ''}
          </p>
        </div>
        <Link href="/waivers" className="text-xs text-amber-300 hover:underline shrink-0">
          Manage waivers
        </Link>
      </div>
      <ul className="space-y-2 text-sm max-h-48 overflow-y-auto">
        {gaps.slice(0, 8).map((gap) => (
          <li key={gap.memberId} className="flex items-start justify-between gap-3">
            <Link href={`/members/${gap.memberId}`} className="text-white/80 hover:text-white">
              {gap.firstName} {gap.lastName}
            </Link>
            <span className="text-white/35 text-xs text-right">
              {gap.issues.map((i) => i.title).join(', ')}
            </span>
          </li>
        ))}
      </ul>
      {gaps.length > 8 && (
        <p className="text-white/30 text-xs mt-2">+{gaps.length - 8} more members</p>
      )}
    </div>
  );
}

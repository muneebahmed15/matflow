'use client';

import { useState } from 'react';
import { setPlanActiveAction } from '@/app/(dashboard)/actions';

type Props = {
  planId: string;
  isActive: boolean;
};

export default function PlanToggleButton({ planId, isActive: initialActive }: Props) {
  const [isActive, setIsActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const next = !isActive;
    const result = await setPlanActiveAction(planId, next);
    setLoading(false);
    if (result.ok) setIsActive(next);
  };

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      disabled={loading}
      className={`text-xs px-3 py-1 rounded-full border transition disabled:opacity-50 ${
        isActive
          ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
          : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
      }`}
    >
      {loading ? '…' : isActive ? 'Deactivate' : 'Activate'}
    </button>
  );
}

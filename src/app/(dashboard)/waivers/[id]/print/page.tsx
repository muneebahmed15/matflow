'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentStaffInfo } from '@/lib/permissions';
import { renderWaiverMergeFields } from '@/lib/waiver-templates';

type Waiver = {
  id: string;
  title: string;
  body: string;
  version?: number;
  created_at: string;
};

export default function WaiverPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [waiver, setWaiver] = useState<Waiver | null>(null);
  const [gymName, setGymName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const info = await getCurrentStaffInfo();
      if (!info.gymId) { setLoading(false); return; }

      const [{ data: w }, { data: gym }] = await Promise.all([
        supabase.from('waivers').select('id, title, body, version, created_at').eq('id', id).eq('gym_id', info.gymId).maybeSingle(),
        supabase.from('gyms').select('name').eq('id', info.gymId).maybeSingle(),
      ]);

      setWaiver((w as Waiver) ?? null);
      setGymName(gym?.name ?? '');
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!loading && waiver) {
      // Give the browser a beat to paint before opening the print dialog.
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [loading, waiver]);

  if (loading) return <p className="p-8 text-gray-500">Loading...</p>;
  if (!waiver) return <p className="p-8 text-gray-500">Waiver not found.</p>;

  const body = renderWaiverMergeFields(waiver.body, { gymName });

  return (
    <div className="min-h-screen bg-white text-black p-12 max-w-3xl mx-auto print:p-0">
      <div className="border-b border-gray-300 pb-4 mb-6">
        <h1 className="text-2xl font-bold">{waiver.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {gymName} · Version {waiver.version ?? 1}
        </p>
      </div>

      <div className="whitespace-pre-wrap text-sm leading-relaxed mb-12">{body}</div>

      <div className="grid grid-cols-2 gap-12 mt-16">
        <div>
          <div className="border-b border-black h-8" />
          <p className="text-xs text-gray-500 mt-1">Member signature</p>
        </div>
        <div>
          <div className="border-b border-black h-8" />
          <p className="text-xs text-gray-500 mt-1">Date</p>
        </div>
        <div>
          <div className="border-b border-black h-8" />
          <p className="text-xs text-gray-500 mt-1">Parent / guardian signature (if minor)</p>
        </div>
        <div>
          <div className="border-b border-black h-8" />
          <p className="text-xs text-gray-500 mt-1">Printed name</p>
        </div>
      </div>
    </div>
  );
}

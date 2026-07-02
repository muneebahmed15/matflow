'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentStaffInfo } from '@/lib/permissions';
import { Users } from 'lucide-react';

type FamilyRow = {
  id: string;
  family_name: string;
  primary_email: string | null;
  member_count: number;
};

export default function FamiliesPage() {
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const info = await getCurrentStaffInfo();
      if (!info.gymId) return;

      const { data: fams } = await supabase
        .from('families')
        .select('id, family_name, primary_email')
        .eq('gym_id', info.gymId)
        .order('family_name');

      const rows: FamilyRow[] = [];
      for (const f of fams ?? []) {
        const { count } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', f.id);
        rows.push({ ...f, member_count: count ?? 0 });
      }
      setFamilies(rows);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Families</h1>
      <p className="text-white/40 text-sm mb-8">Shared billing groups. Link members when adding or editing profiles.</p>

      {loading ? (
        <p className="text-white/30">Loading...</p>
      ) : families.length === 0 ? (
        <div className="text-center py-12 text-white/30">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          No families yet. Create one when adding a member.
        </div>
      ) : (
        <div className="space-y-2">
          {families.map((f) => (
            <div key={f.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex justify-between">
              <div>
                <p className="text-white font-medium">{f.family_name}</p>
                {f.primary_email && <p className="text-white/30 text-xs">{f.primary_email}</p>}
              </div>
              <span className="text-white/40 text-sm">{f.member_count} member{f.member_count === 1 ? '' : 's'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

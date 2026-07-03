'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getCurrentStaffInfo } from '@/lib/permissions';
import { Users, ArrowLeft } from 'lucide-react';
import PageLoader from '@/components/PageLoader';

type Family = {
  id: string;
  family_name: string;
  primary_email: string | null;
  created_at: string;
};

type FamilyMember = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  status: string;
  belt_rank: string | null;
  auth_user_id: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400',
  past_due: 'bg-yellow-500/10 text-yellow-400',
  inactive: 'bg-white/10 text-white/40',
  archived: 'bg-white/10 text-white/40',
};

export default function FamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const info = await getCurrentStaffInfo();
      if (!info.gymId) { setLoading(false); return; }

      const [{ data: fam }, { data: mems }] = await Promise.all([
        supabase
          .from('families')
          .select('id, family_name, primary_email, created_at')
          .eq('id', id)
          .eq('gym_id', info.gymId)
          .maybeSingle(),
        supabase
          .from('members')
          .select('id, first_name, last_name, email, status, belt_rank, auth_user_id')
          .eq('family_id', id)
          .eq('gym_id', info.gymId)
          .order('first_name'),
      ]);

      setFamily((fam as Family) ?? null);
      setMembers((mems as FamilyMember[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <PageLoader />;

  if (!family) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <Link href="/families" className="text-sm text-white/40 hover:text-white flex items-center gap-1 mb-6">
          <ArrowLeft size={14} /> Back to families
        </Link>
        <p className="text-white/40">Family not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <Link href="/families" className="text-sm text-white/40 hover:text-white flex items-center gap-1 mb-6">
        <ArrowLeft size={14} /> Back to families
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
          <Users size={18} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">{family.family_name}</h1>
          {family.primary_email && <p className="text-white/40 text-sm">{family.primary_email}</p>}
        </div>
      </div>

      <p className="text-white/30 text-xs mb-8">
        Created {new Date(family.created_at).toLocaleDateString()} · {members.length} member{members.length === 1 ? '' : 's'}
      </p>

      <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Members</h2>
      {members.length === 0 ? (
        <p className="text-white/30 text-sm">No members linked to this family yet. Link members when adding or editing profiles.</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/members/${m.id}`}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between transition"
            >
              <div>
                <p className="text-white font-medium">
                  {m.first_name} {m.last_name}
                  {m.auth_user_id && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-full">
                      Portal access
                    </span>
                  )}
                </p>
                <p className="text-white/30 text-xs">
                  {m.email ?? 'No email'}
                  {m.belt_rank ? ` · ${m.belt_rank} belt` : ''}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg capitalize ${STATUS_STYLES[m.status] ?? 'bg-white/10 text-white/40'}`}>
                {m.status.replace('_', ' ')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

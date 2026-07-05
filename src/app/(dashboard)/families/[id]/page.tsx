'use client';

import { useCallback, useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Users, ArrowLeft, CreditCard } from 'lucide-react';
import PageLoader from '@/components/PageLoader';
import { getFamilyDetailAction, setFamilyBillingContactAction, mergeFamiliesAction } from '@/app/(dashboard)/actions';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400',
  past_due: 'bg-yellow-500/10 text-yellow-400',
  inactive: 'bg-white/10 text-white/40',
  archived: 'bg-white/10 text-white/40',
};

export default function FamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [family, setFamily] = useState<{
    id: string;
    family_name: string;
    primary_email: string | null;
    created_at: string;
    billing_member_id: string | null;
  } | null>(null);
  const [members, setMembers] = useState<
    {
      id: string;
      first_name: string;
      last_name: string;
      email: string | null;
      status: string;
      belt_rank: string | null;
      auth_user_id: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [savingBilling, setSavingBilling] = useState(false);
  const [sourceFamilyId, setSourceFamilyId] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');

  const load = useCallback(async () => {
    const result = await getFamilyDetailAction(id);
    if (result.ok && result.data) {
      setFamily(result.data.family);
      setMembers(result.data.members);
    }
    setLoading(false);
  }, [id]);

  useAsyncMount(load, [load]);

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

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
        Created {new Date(family.created_at).toLocaleDateString()} · {members.length} member
        {members.length === 1 ? '' : 's'}
      </p>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-5 mb-8 space-y-3">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <CreditCard size={16} className="text-blue-400" /> Billing contact
        </h2>
        <p className="text-white/40 text-sm">
          The member who receives invoices and is the primary billing contact for this family.
        </p>
        <select
          value={family.billing_member_id ?? ''}
          disabled={savingBilling || members.length === 0}
          onChange={async (e) => {
            setSavingBilling(true);
            const billingMemberId = e.target.value || null;
            const result = await setFamilyBillingContactAction(family.id, billingMemberId);
            if (result.ok && result.data) setFamily((prev) => (prev ? { ...prev, billing_member_id: billingMemberId } : prev));
            setSavingBilling(false);
          }}
          className={inputClass}
        >
          <option value="" className="bg-gray-900">
            Not designated
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id} className="bg-gray-900">
              {m.first_name} {m.last_name}
              {m.email ? ` (${m.email})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-5 mb-8 space-y-3">
        <h2 className="font-semibold text-white">Merge family</h2>
        <p className="text-white/40 text-sm">
          Move all members from another family into this one, then delete the source family.
        </p>
        <input
          value={sourceFamilyId}
          onChange={(e) => setSourceFamilyId(e.target.value)}
          placeholder="Source family ID to merge in"
          className={inputClass}
        />
        {mergeError && <p className="text-red-400 text-sm">{mergeError}</p>}
        <button
          disabled={merging || !sourceFamilyId.trim()}
          onClick={async () => {
            if (!confirm('Merge the source family into this one? This cannot be undone.')) return;
            setMerging(true);
            setMergeError('');
            const result = await mergeFamiliesAction(family.id, sourceFamilyId.trim());
            setMerging(false);
            if (result.ok) {
              setSourceFamilyId('');
              void load();
            } else {
              setMergeError(result.error ?? 'Merge failed');
            }
          }}
          className="text-sm text-amber-400 hover:underline disabled:opacity-40"
        >
          {merging ? 'Merging…' : 'Merge into this family'}
        </button>
      </div>

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
                  {family.billing_member_id === m.id && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-full">
                      Billing
                    </span>
                  )}
                  {m.auth_user_id && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide bg-green-500/15 text-green-300 px-2 py-0.5 rounded-full">
                      Portal
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

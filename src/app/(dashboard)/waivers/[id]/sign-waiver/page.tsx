'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  getWaivers,
  signWaiver,
  hasSignedWaiver,
  getMemberSignatures,
  type Waiver,
  type WaiverSignature,
} from '@/lib/waivers';
import WaiverSignatureBox from '@/components/WaiverSignatureBox';

type Member = { id: string; first_name: string; last_name: string; gym_id: string };
type SignatureWithWaiver = WaiverSignature & { waivers: { title: string } };

export default function SignWaiverPage() {
  const { id: memberId } = useParams<{ id: string }>();
  const router = useRouter();

  const [member, setMember] = useState<Member | null>(null);
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [selected, setSelected] = useState<Waiver | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [signedAt, setSignedAt] = useState<string | undefined>();
  const [existingSigs, setExistingSigs] = useState<SignatureWithWaiver[]>([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: mem } = await supabase
        .from('members')
        .select('id, first_name, last_name, gym_id')
        .eq('id', memberId)
        .single();

      if (!mem) return;
      setMember(mem);

      const gymWaivers = await getWaivers(mem.gym_id);
      const active = gymWaivers.filter((w) => w.is_active);
      setWaivers(active);

      const sigs = await getMemberSignatures(memberId);
      setExistingSigs(sigs as SignatureWithWaiver[]);

      if (active.length > 0) {
        setSelected(active[0]);
        const signed = await hasSignedWaiver(active[0].id, memberId);
        setAlreadySigned(signed);
        if (signed) {
          const match = sigs.find((s) => s.waiver_id === active[0].id);
          setSignedAt(match?.signed_at);
        }
      }

      setLoading(false);
    }
    load();
  }, [memberId]);

  const handleSelectWaiver = async (waiver: Waiver) => {
    setSelected(waiver);
    setSuccess(false);
    const signed = await hasSignedWaiver(waiver.id, memberId);
    setAlreadySigned(signed);
    if (signed) {
      const match = existingSigs.find((s) => s.waiver_id === waiver.id);
      setSignedAt(match?.signed_at);
    } else {
      setSignedAt(undefined);
    }
  };

  const handleSign = async (typedName: string) => {
    if (!selected || !member) return;
    await signWaiver(selected.id, member.id, member.gym_id, typedName);
    setAlreadySigned(true);
    setSignedAt(new Date().toISOString());
    setSuccess(true);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-gray-500">Loading…</p>
    </div>
  );

  const memberName = member ? `${member.first_name} ${member.last_name}` : '';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1">
          ← Back
        </button>

        <h1 className="text-2xl font-bold mb-1">Sign Waiver</h1>
        <p className="text-gray-400 text-sm mb-8">
          Member: <span className="text-white font-semibold">{memberName}</span>
        </p>

        {waivers.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-gray-400">No active waivers available.</p>
          </div>
        ) : (
          <>
            {waivers.length > 1 && (
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Select Waiver</label>
                <div className="flex flex-wrap gap-2">
                  {waivers.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => handleSelectWaiver(w)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                        selected?.id === w.id
                          ? 'border-red-500 bg-red-500/20 text-red-400'
                          : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/30'
                      }`}
                    >
                      {w.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selected && (
              <>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-2">
                  <h2 className="font-semibold mb-3">{selected.title}</h2>
                  <div className="max-h-64 overflow-y-auto pr-1">
                    <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {selected.body}
                    </pre>
                  </div>
                </div>

                {success && (
                  <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                    <p className="text-green-400 font-semibold">✅ Waiver signed successfully!</p>
                  </div>
                )}

                <WaiverSignatureBox
                  memberName={memberName}
                  onSign={handleSign}
                  alreadySigned={alreadySigned}
                  signedAt={signedAt}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
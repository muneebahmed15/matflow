import { notFound } from 'next/navigation';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { getAdminClient } from '@/lib/supabase/admin';

type Props = { params: Promise<{ gymSlug: string }> };

/** Entrance display / NFC tag destination — shows live belt roster. */
export default async function NfcDisplayPage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const admin = getAdminClient();
  const { data: gymRow } = await admin
    .from('gyms')
    .select('nfc_display_enabled')
    .eq('id', gym.id)
    .maybeSingle();

  if (!gymRow?.nfc_display_enabled) notFound();

  const { data: members } = await admin
    .from('members')
    .select('first_name, last_name, belt_rank, stripe_count')
    .eq('gym_id', gym.id)
    .eq('status', 'active')
    .order('belt_rank')
    .order('last_name')
    .limit(40);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-1">{gym.name}</h1>
      <p className="text-white/40 text-sm mb-8">Member ranks — tap NFC tag to verify at front desk</p>
      <div className="grid gap-2">
        {(members ?? []).map((m) => (
          <div
            key={`${m.first_name}-${m.last_name}-${m.belt_rank}`}
            className="flex justify-between items-center bg-white/5 rounded-lg px-4 py-3"
          >
            <span>
              {m.first_name} {m.last_name}
            </span>
            <span className="capitalize text-white/70">
              {m.belt_rank}
              {(m.stripe_count ?? 0) > 0 ? ` · ${m.stripe_count} stripe(s)` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

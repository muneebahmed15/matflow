import { notFound } from 'next/navigation';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { verifyMemberRankToken } from '@/lib/auth/member-rank-token';
import { getAdminClient } from '@/lib/supabase/admin';

type Props = {
  params: Promise<{ gymSlug: string }>;
  searchParams: Promise<{ member_id?: string; token?: string }>;
};

export default async function MemberRankVerifyPage({ params, searchParams }: Props) {
  const { gymSlug } = await params;
  const { member_id, token } = await searchParams;

  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym || !member_id || !token) notFound();

  if (!verifyMemberRankToken(member_id, gym.id, token)) notFound();

  const admin = getAdminClient();
  const { data: member } = await admin
    .from('members')
    .select('first_name, last_name, belt_rank, stripe_count, status')
    .eq('id', member_id)
    .eq('gym_id', gym.id)
    .maybeSingle();

  if (!member || member.status !== 'active') notFound();

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <p className="text-white/40 text-sm uppercase tracking-wider mb-2">{gym.name}</p>
      <h1 className="text-2xl font-bold text-white mb-1">
        {member.first_name} {member.last_name}
      </h1>
      <p className="text-3xl font-extrabold capitalize text-white mt-6">{member.belt_rank} belt</p>
      {(member.stripe_count ?? 0) > 0 && (
        <p className="text-white/50 mt-2">
          {member.stripe_count} stripe{(member.stripe_count ?? 0) === 1 ? '' : 's'}
        </p>
      )}
      <p className="text-green-400/80 text-sm mt-8">Verified member rank</p>
    </div>
  );
}

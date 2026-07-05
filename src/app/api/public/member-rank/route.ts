import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyMemberRankToken } from '@/lib/auth/member-rank-token';
import { handleRouteError } from '@/lib/api-error';

const querySchema = z.object({
  gym_id: z.string().uuid(),
  member_id: z.string().uuid(),
  token: z.string().min(16).max(64),
});

/** Verify member rank via signed QR / membership card link. */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { gym_id, member_id, token } = parsed.data;

  if (!verifyMemberRankToken(member_id, gym_id, token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  try {
    const admin = getAdminClient();
    const { data: member } = await admin
      .from('members')
      .select('id, first_name, last_name, belt_rank, stripe_count, status, gym_id, gyms(name, slug, website_enabled)')
      .eq('id', member_id)
      .eq('gym_id', gym_id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const gym = Array.isArray(member.gyms) ? member.gyms[0] : member.gyms;
    if (!gym?.website_enabled) {
      return NextResponse.json({ error: 'Not available' }, { status: 404 });
    }

    return NextResponse.json({
      member_id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      belt_rank: member.belt_rank,
      stripe_count: member.stripe_count ?? 0,
      status: member.status,
      gym_name: gym.name,
      gym_slug: gym.slug,
    });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Failed to load rank',
      logMessage: 'Public member-rank failed',
    });
  }
}

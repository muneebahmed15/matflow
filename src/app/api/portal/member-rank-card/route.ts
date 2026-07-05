import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { signMemberRankToken } from '@/lib/auth/member-rank-token';
import { getPublicEnv } from '@/lib/env';
import { handleRouteError } from '@/lib/api-error';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getAdminClient();
    const { data: member } = await admin
      .from('members')
      .select('id, gym_id, status, gyms(slug, website_enabled)')
      .eq('email', user.email)
      .maybeSingle();

    if (!member || member.status !== 'active') {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const gym = Array.isArray(member.gyms) ? member.gyms[0] : member.gyms;
    if (!gym?.website_enabled || !gym.slug) {
      return NextResponse.json({ error: 'Rank card unavailable' }, { status: 404 });
    }

    const token = signMemberRankToken(member.id, member.gym_id);
    const { NEXT_PUBLIC_APP_URL } = getPublicEnv();
    const verifyUrl = `${NEXT_PUBLIC_APP_URL}/g/${gym.slug}/rank?member_id=${member.id}&token=${token}`;

    return NextResponse.json({
      verify_url: verifyUrl,
      member_id: member.id,
      gym_id: member.gym_id,
    });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Failed to build rank card',
      logMessage: 'portal member-rank-card failed',
    });
  }
}

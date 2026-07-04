import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyReviewClickToken } from '@/lib/review-click-token';
import { markReviewLinkClicked, googleReviewUrl } from '@/services/marketing';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const gymId = searchParams.get('gym');
  const memberId = searchParams.get('member');
  const requestId = searchParams.get('request');
  const token = searchParams.get('token');

  if (!gymId || !memberId || !requestId || !token) {
    return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
  }

  if (!verifyReviewClickToken(gymId, memberId, requestId, token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  await markReviewLinkClicked(gymId, memberId, requestId);

  const admin = getAdminClient();
  const { data: gym } = await admin.from('gyms').select('google_place_id').eq('id', gymId).maybeSingle();
  const reviewUrl = googleReviewUrl(gym?.google_place_id ?? null);

  if (reviewUrl) {
    return NextResponse.redirect(reviewUrl);
  }

  return NextResponse.redirect(new URL(`/g`, request.url));
}

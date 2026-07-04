import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { safeRedirectUrl, verifyCampaignTrackingToken } from '@/lib/campaign-tracking';

async function incrementClickCount(gymId: string, campaignId: string) {
  const admin = getAdminClient();
  const { data: campaign } = await admin
    .from('email_campaigns')
    .select('id, click_count')
    .eq('id', campaignId)
    .eq('gym_id', gymId)
    .eq('status', 'sent')
    .maybeSingle();

  if (!campaign) return;

  await admin
    .from('email_campaigns')
    .update({ click_count: (campaign.click_count ?? 0) + 1 })
    .eq('id', campaignId)
    .eq('gym_id', gymId);
}

/** Campaign click redirect (increments click_count, then redirects). */
export async function GET(req: NextRequest) {
  const gymId = req.nextUrl.searchParams.get('gym');
  const campaignId = req.nextUrl.searchParams.get('c');
  const email = req.nextUrl.searchParams.get('email');
  const token = req.nextUrl.searchParams.get('token');
  const target = req.nextUrl.searchParams.get('u');

  if (
    !gymId ||
    !campaignId ||
    !email ||
    !token ||
    !target ||
    !verifyCampaignTrackingToken(gymId, campaignId, email, token)
  ) {
    return new NextResponse('Invalid tracking link.', { status: 400 });
  }

  const redirectTo = safeRedirectUrl(target);
  if (!redirectTo) {
    return new NextResponse('Invalid redirect URL.', { status: 400 });
  }

  await incrementClickCount(gymId, campaignId);
  return NextResponse.redirect(redirectTo, 302);
}

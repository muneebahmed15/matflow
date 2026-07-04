import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { TRACKING_PIXEL, verifyCampaignTrackingToken } from '@/lib/campaign-tracking';

async function incrementCampaignMetric(
  gymId: string,
  campaignId: string,
  column: 'open_count' | 'click_count'
) {
  const admin = getAdminClient();
  const { data: campaign } = await admin
    .from('email_campaigns')
    .select('id, open_count, click_count')
    .eq('id', campaignId)
    .eq('gym_id', gymId)
    .eq('status', 'sent')
    .maybeSingle();

  if (!campaign) return;

  const nextValue = (campaign[column] ?? 0) + 1;
  await admin.from('email_campaigns').update({ [column]: nextValue }).eq('id', campaignId).eq('gym_id', gymId);
}

/** Campaign open tracking pixel (increments open_count). */
export async function GET(req: NextRequest) {
  const gymId = req.nextUrl.searchParams.get('gym');
  const campaignId = req.nextUrl.searchParams.get('c');
  const email = req.nextUrl.searchParams.get('email');
  const token = req.nextUrl.searchParams.get('token');

  if (
    gymId &&
    campaignId &&
    email &&
    token &&
    verifyCampaignTrackingToken(gymId, campaignId, email, token)
  ) {
    await incrementCampaignMetric(gymId, campaignId, 'open_count');
  }

  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

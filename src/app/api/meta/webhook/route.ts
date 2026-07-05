import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { handleInboundMetaMessage } from '@/services/ai-front-desk';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || !token || !challenge) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getAdminClient();
  const { data: gym } = await admin
    .from('gyms')
    .select('id')
    .eq('meta_verify_token', token)
    .maybeSingle();

  if (!gym) {
    return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    object?: string;
    entry?: Array<{
      messaging?: Array<{
        sender?: { id?: string };
        message?: { text?: string };
      }>;
    }>;
  };

  if (body.object !== 'page') {
    return NextResponse.json({ ok: true });
  }

  const admin = getAdminClient();

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id;
      const text = event.message?.text;
      if (!senderId || !text) continue;

      const { data: gyms } = await admin
        .from('gyms')
        .select('id, meta_page_id')
        .not('meta_page_access_token', 'is', null);

      const gym = gyms?.find((g) => g.meta_page_id);
      if (!gym) continue;

      try {
        await handleInboundMetaMessage({
          gymId: gym.id,
          channel: 'messenger',
          senderId,
          text,
        });
      } catch (err) {
        logger.warn({ err, gymId: gym.id }, 'Meta webhook handler failed');
      }
    }
  }

  return NextResponse.json({ ok: true });
}

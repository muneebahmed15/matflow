import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  handleInboundMetaMessage,
  handleInboundWhatsApp,
} from '@/services/ai-front-desk';
import { parseWhatsAppWebhook, sendWhatsAppText } from '@/lib/whatsapp/meta';
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

type GymMetaRow = {
  id: string;
  meta_page_id: string | null;
  meta_page_access_token: string | null;
  whatsapp_enabled: boolean;
  whatsapp_phone_number_id: string | null;
  meta_instagram_id: string | null;
};

async function findGymForWhatsApp(phoneNumberId: string): Promise<GymMetaRow | null> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('gyms')
    .select(
      'id, meta_page_id, meta_page_access_token, whatsapp_enabled, whatsapp_phone_number_id, meta_instagram_id'
    )
    .eq('whatsapp_phone_number_id', phoneNumberId)
    .eq('whatsapp_enabled', true)
    .not('meta_page_access_token', 'is', null)
    .maybeSingle();

  return data as GymMetaRow | null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.object === 'whatsapp_business_account') {
    const admin = getAdminClient();

    for (const message of parseWhatsAppWebhook(body)) {
      const gym = await findGymForWhatsApp(message.phoneNumberId);
      if (!gym?.meta_page_access_token) continue;

      try {
        const { reply } = await handleInboundWhatsApp({
          gymId: gym.id,
          from: message.from,
          body: message.text,
        });

        if (reply) {
          await sendWhatsAppText({
            config: {
              phoneNumberId: message.phoneNumberId,
              accessToken: gym.meta_page_access_token,
            },
            to: message.from,
            body: reply,
          });
        }
      } catch (err) {
        logger.warn({ err, gymId: gym.id }, 'WhatsApp webhook handler failed');
      }
    }

    return NextResponse.json({ ok: true });
  }

  const payload = body as {
    object?: string;
    entry?: Array<{
      messaging?: Array<{
        sender?: { id?: string };
        message?: { text?: string };
      }>;
    }>;
  };

  if (payload.object !== 'page') {
    return NextResponse.json({ ok: true });
  }

  const admin = getAdminClient();

  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id;
      const text = event.message?.text;
      if (!senderId || !text) continue;

      const { data: gyms } = await admin
        .from('gyms')
        .select('id, meta_page_id, meta_page_access_token')
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

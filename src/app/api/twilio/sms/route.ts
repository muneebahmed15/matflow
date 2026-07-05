import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getTwilioEnv } from '@/lib/sms/twilio';
import { handleInboundSms } from '@/services/ai-front-desk';
import { logger } from '@/lib/logger';

function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null
): boolean {
  const twilio = getTwilioEnv();
  if (!twilio || !signature) return !twilio;

  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac('sha1', twilio.TWILIO_AUTH_TOKEN).update(sorted).digest('base64');

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    params[key] = String(value);
  });

  const signature = req.headers.get('x-twilio-signature');
  const url = req.nextUrl.origin + req.nextUrl.pathname + req.nextUrl.search;

  if (!verifyTwilioSignature(url, params, signature)) {
    logger.warn('Twilio SMS webhook signature mismatch');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  const from = params.From ?? '';
  const body = params.Body ?? '';
  const to = params.To ?? '';

  const admin = getAdminClient();

  const { data: gym } = await admin
    .from('gyms')
    .select('id')
    .eq('twilio_phone', to)
    .maybeSingle();

  let gymId = gym?.id;

  if (!gymId && to) {
    const { data: anyGym } = await admin.from('gyms').select('id').limit(1).maybeSingle();
    gymId = anyGym?.id;
  }

  if (!gymId) {
    return new NextResponse('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }

  const { reply } = await handleInboundSms({ gymId, from, body });

  const twiml = reply
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Message></Response>`
    : '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}

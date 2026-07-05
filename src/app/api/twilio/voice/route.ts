import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getTwilioEnv } from '@/lib/sms/twilio';
import { handleIncomingCall, resolveGymByPhone } from '@/services/ai-voice';
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

async function parseTwilio(req: NextRequest): Promise<Record<string, string>> {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    params[key] = String(value);
  });
  return params;
}

export async function POST(req: NextRequest) {
  const params = await parseTwilio(req);
  const signature = req.headers.get('x-twilio-signature');
  const url = req.nextUrl.origin + req.nextUrl.pathname + req.nextUrl.search;

  if (!verifyTwilioSignature(url, params, signature)) {
    logger.warn('Twilio voice webhook signature mismatch');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  const gymId = (await resolveGymByPhone(params.To ?? '')) ?? null;
  if (!gymId) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }

  const twiml = await handleIncomingCall({
    gymId,
    callSid: params.CallSid ?? '',
    from: params.From ?? '',
    to: params.To ?? '',
  });

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}

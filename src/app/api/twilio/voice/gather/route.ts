import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getTwilioEnv } from '@/lib/sms/twilio';
import { handleVoiceGather } from '@/services/ai-voice';
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
    logger.warn('Twilio gather signature mismatch');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  const gymId = req.nextUrl.searchParams.get('gymId') ?? '';
  const conversationId = req.nextUrl.searchParams.get('conversationId') ?? '';

  const twiml = await handleVoiceGather({
    gymId,
    conversationId,
    callSid: params.CallSid ?? '',
    speechResult: params.SpeechResult ?? params.Digits,
  });

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}

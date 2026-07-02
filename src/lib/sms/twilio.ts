import { getServerEnv } from '@/lib/env';
import { ServiceError } from '@/services/errors';
import { isProduction } from '@/lib/env';

export type TwilioEnv = {
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_FROM_NUMBER: string;
};

export function getTwilioEnv(): TwilioEnv | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return null;
  return { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM_NUMBER: from };
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  return `+${digits}`;
}

export async function sendSms(input: {
  to: string;
  body: string;
  from?: string;
}): Promise<{ sid: string; channel: 'twilio' | 'dev' }> {
  const twilio = getTwilioEnv();
  const to = normalizePhone(input.to);

  if (twilio) {
    const from = input.from ?? twilio.TWILIO_FROM_NUMBER;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilio.TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${twilio.TWILIO_ACCOUNT_SID}:${twilio.TWILIO_AUTH_TOKEN}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: input.body }),
    });

    const body = (await response.json()) as { sid?: string; message?: string };
    if (!response.ok) {
      throw new ServiceError(502, body.message ?? 'Twilio error');
    }
    return { sid: body.sid ?? 'unknown', channel: 'twilio' };
  }

  if (isProduction()) {
    getServerEnv();
    throw new ServiceError(503, 'SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.');
  }

  console.info('[dev sms]', { to, body: input.body });
  return { sid: 'dev-log', channel: 'dev' };
}

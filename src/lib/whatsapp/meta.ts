import { ServiceError } from '@/services/errors';
import { isProduction } from '@/lib/env';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

export type WhatsAppGymConfig = {
  phoneNumberId: string;
  accessToken: string;
};

export function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return digits;
}

export function toWhatsAppE164(phone: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  return normalized.startsWith('+') ? normalized : `+${normalized}`;
}

export async function sendWhatsAppText(input: {
  config: WhatsAppGymConfig;
  to: string;
  body: string;
}): Promise<{ messageId: string; channel: 'whatsapp' | 'dev' }> {
  const to = normalizeWhatsAppPhone(input.to);
  const token = input.config.accessToken.trim();
  const phoneNumberId = input.config.phoneNumberId.trim();

  if (!token || !phoneNumberId) {
    throw new ServiceError(503, 'WhatsApp is not configured for this gym.');
  }

  if (!isProduction()) {
    console.info('[dev whatsapp]', { to, body: input.body });
    return { messageId: 'dev-log', channel: 'dev' };
  }

  const response = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: true, body: input.body },
    }),
  });

  const data = (await response.json()) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new ServiceError(502, data.error?.message ?? 'WhatsApp send failed');
  }

  return { messageId: data.messages?.[0]?.id ?? 'unknown', channel: 'whatsapp' };
}

export type WhatsAppInboundMessage = {
  phoneNumberId: string;
  businessAccountId: string;
  from: string;
  text: string;
  messageId: string;
};

export function parseWhatsAppWebhook(body: unknown): WhatsAppInboundMessage[] {
  const payload = body as {
    object?: string;
    entry?: Array<{
      id?: string;
      changes?: Array<{
        field?: string;
        value?: {
          metadata?: { phone_number_id?: string };
          messages?: Array<{
            from?: string;
            id?: string;
            type?: string;
            text?: { body?: string };
          }>;
        };
      }>;
    }>;
  };

  if (payload.object !== 'whatsapp_business_account') return [];

  const messages: WhatsAppInboundMessage[] = [];

  for (const entry of payload.entry ?? []) {
    const businessAccountId = entry.id ?? '';
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      const phoneNumberId = change.value?.metadata?.phone_number_id ?? '';
      for (const msg of change.value?.messages ?? []) {
        if (msg.type !== 'text' || !msg.from || !msg.text?.body) continue;
        messages.push({
          phoneNumberId,
          businessAccountId,
          from: msg.from,
          text: msg.text.body,
          messageId: msg.id ?? '',
        });
      }
    }
  }

  return messages;
}

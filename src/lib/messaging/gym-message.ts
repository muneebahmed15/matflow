import { getAdminClient } from '@/lib/supabase/admin';
import { sendWhatsAppText } from '@/lib/whatsapp/meta';
import { sendSms } from '@/lib/sms/twilio';
import { ServiceError } from '@/services/errors';

type GymMessagingConfig = {
  whatsappEnabled: boolean;
  whatsappPhoneNumberId: string | null;
  metaAccessToken: string | null;
  twilioPhone: string | null;
};

async function getGymMessagingConfig(gymId: string): Promise<GymMessagingConfig> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('gyms')
    .select(
      'whatsapp_enabled, whatsapp_phone_number_id, meta_page_access_token, twilio_phone'
    )
    .eq('id', gymId)
    .maybeSingle();

  if (error || !data) throw new ServiceError(404, 'Gym not found');

  return {
    whatsappEnabled: Boolean(data.whatsapp_enabled),
    whatsappPhoneNumberId: data.whatsapp_phone_number_id ?? null,
    metaAccessToken: data.meta_page_access_token ?? null,
    twilioPhone: data.twilio_phone ?? null,
  };
}

/** Send a text message via WhatsApp Business when enabled, otherwise Twilio SMS. */
export async function sendGymTextMessage(input: {
  gymId: string;
  to: string;
  body: string;
}): Promise<{ sid: string; channel: 'whatsapp' | 'twilio' | 'dev' }> {
  const config = await getGymMessagingConfig(input.gymId);

  if (
    config.whatsappEnabled &&
    config.whatsappPhoneNumberId &&
    config.metaAccessToken
  ) {
    const result = await sendWhatsAppText({
      config: {
        phoneNumberId: config.whatsappPhoneNumberId,
        accessToken: config.metaAccessToken,
      },
      to: input.to,
      body: input.body,
    });
    return { sid: result.messageId, channel: result.channel };
  }

  const sms = await sendSms({
    to: input.to,
    from: config.twilioPhone ?? undefined,
    body: input.body,
  });
  return { sid: sms.sid, channel: sms.channel };
}

export async function gymUsesWhatsApp(gymId: string): Promise<boolean> {
  const config = await getGymMessagingConfig(gymId);
  return Boolean(
    config.whatsappEnabled && config.whatsappPhoneNumberId && config.metaAccessToken
  );
}

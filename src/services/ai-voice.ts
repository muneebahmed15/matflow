import { getAdminClient } from '@/lib/supabase/admin';
import { generateLlmReply } from '@/lib/ai/llm';
import { twimlDial, twimlGather, twimlRecord, twimlResponse, twimlSay } from '@/lib/twilio/voice-twiml';
import { getPublicEnv } from '@/lib/env';
import { recordAiUsage } from '@/lib/ai/usage-metering';
import { logger } from '@/lib/logger';

function baseUrl(): string {
  return getPublicEnv().NEXT_PUBLIC_APP_URL;
}

export async function resolveGymByPhone(to: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data: gym } = await admin.from('gyms').select('id').eq('twilio_phone', to).maybeSingle();
  return gym?.id ?? null;
}

export async function logVoiceCall(input: {
  gymId: string;
  callSid: string;
  from: string;
  to: string;
  status: string;
  durationSeconds?: number;
  recordingUrl?: string;
  transcription?: string;
  transferred?: boolean;
  conversationId?: string;
}): Promise<void> {
  const admin = getAdminClient();
  await admin.from('ai_voice_calls').upsert(
    {
      gym_id: input.gymId,
      call_sid: input.callSid,
      from_phone: input.from,
      to_phone: input.to,
      status: input.status,
      duration_seconds: input.durationSeconds ?? 0,
      recording_url: input.recordingUrl ?? null,
      transcription: input.transcription ?? null,
      transferred: input.transferred ?? false,
      conversation_id: input.conversationId ?? null,
      completed_at: ['completed', 'missed', 'voicemail', 'transferred'].includes(input.status)
        ? new Date().toISOString()
        : null,
    },
    { onConflict: 'call_sid' }
  );
}

async function getGymVoiceConfig(gymId: string) {
  const admin = getAdminClient();
  const { data } = await admin
    .from('gyms')
    .select(
      'name, ai_voice_enabled, ai_voice_transfer_keyword, ai_voice_record_calls, staff_transfer_phone, ai_persona_name, ai_tone'
    )
    .eq('id', gymId)
    .maybeSingle();
  return data;
}

export async function handleIncomingCall(input: {
  gymId: string;
  callSid: string;
  from: string;
  to: string;
}): Promise<string> {
  const gym = await getGymVoiceConfig(input.gymId);
  if (!gym?.ai_voice_enabled) {
    await logVoiceCall({ ...input, status: 'missed' });
    return twimlResponse(twimlSay('Thanks for calling. Please visit our website or call back during business hours.'));
  }

  const admin = getAdminClient();
  const { data: conv } = await admin
    .from('ai_conversations')
    .insert({ gym_id: input.gymId, channel: 'phone', status: 'open', visitor_phone: input.from })
    .select('id')
    .single();

  await logVoiceCall({ ...input, status: 'ringing', conversationId: conv?.id });

  const consent = gym.ai_voice_record_calls
    ? 'This call may be recorded for quality. '
    : '';
  const gatherUrl = `${baseUrl()}/api/twilio/voice/gather?gymId=${input.gymId}&conversationId=${conv?.id}`;

  return twimlResponse(
    twimlSay(`${consent}Hi, you've reached ${gym.name}. How can I help you today?`) +
      twimlGather({ action: gatherUrl, message: 'You can ask about classes, pricing, or say staff to reach someone.' })
  );
}

export async function handleVoiceGather(input: {
  gymId: string;
  conversationId: string;
  callSid: string;
  speechResult?: string;
}): Promise<string> {
  const speech = (input.speechResult ?? '').trim();
  const gym = await getGymVoiceConfig(input.gymId);
  const keyword = (gym?.ai_voice_transfer_keyword ?? 'staff').toLowerCase();

  if (speech.toLowerCase().includes(keyword) && gym?.staff_transfer_phone) {
    await logVoiceCall({
      gymId: input.gymId,
      callSid: input.callSid,
      from: '',
      to: '',
      status: 'transferred',
      transferred: true,
      conversationId: input.conversationId,
    });
    return twimlResponse(
      twimlSay('Connecting you with our team now.') + twimlDial(gym.staff_transfer_phone)
    );
  }

  const ctx = {
    gymName: gym?.name ?? 'the gym',
    gymSlug: '',
    personaName: gym?.ai_persona_name ?? undefined,
    tone: gym?.ai_tone === 'formal' ? ('formal' as const) : ('friendly' as const),
  };

  const reply = speech
    ? (await generateLlmReply(speech, [], ctx)).message
    : "Sorry, I didn't catch that.";

  const admin = getAdminClient();
  if (speech) {
    await admin.from('ai_messages').insert([
      { conversation_id: input.conversationId, role: 'user', content: speech },
      { conversation_id: input.conversationId, role: 'assistant', content: reply },
    ]);
  }

  await recordAiUsage({ gymId: input.gymId, channel: 'phone' });
  await logVoiceCall({
    gymId: input.gymId,
    callSid: input.callSid,
    from: '',
    to: '',
    status: 'answered',
    conversationId: input.conversationId,
  });

  const voicemailUrl = `${baseUrl()}/api/twilio/voice/voicemail?gymId=${input.gymId}&conversationId=${input.conversationId}`;
  return twimlResponse(
    twimlSay(reply) +
      twimlSay('Press any key or stay on the line to leave a voicemail.') +
      twimlRecord({ action: voicemailUrl, transcribe: true })
  );
}

export async function handleVoicemail(input: {
  gymId: string;
  conversationId: string;
  callSid: string;
  recordingUrl?: string;
  transcription?: string;
}): Promise<string> {
  await logVoiceCall({
    gymId: input.gymId,
    callSid: input.callSid,
    from: '',
    to: '',
    status: 'voicemail',
    recordingUrl: input.recordingUrl,
    transcription: input.transcription,
    conversationId: input.conversationId,
  });

  if (input.transcription) {
    const admin = getAdminClient();
    await admin.from('ai_messages').insert({
      conversation_id: input.conversationId,
      role: 'user',
      content: `[Voicemail] ${input.transcription}`,
    });
  }

  logger.info({ gymId: input.gymId, callSid: input.callSid }, 'Voicemail recorded');
  return twimlResponse(twimlSay('Thank you. We will get back to you soon. Goodbye.'));
}

export async function countMissedCalls(gymId: string, since: Date): Promise<number> {
  const admin = getAdminClient();
  const { count } = await admin
    .from('ai_voice_calls')
    .select('*', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .in('status', ['missed', 'voicemail'])
    .gte('created_at', since.toISOString());

  return count ?? 0;
}

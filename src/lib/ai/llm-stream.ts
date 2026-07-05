import type { GymContext } from '@/lib/ai/llm';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

type StreamToolCall = {
  name: string;
  args: Record<string, string>;
};

export type StreamResult = {
  message: string;
  toolCall?: StreamToolCall;
};

export async function* streamLlmReply(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  ctx: GymContext
): AsyncGenerator<string, StreamResult, undefined> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { message: '' };
  }

  const persona = ctx.personaName ?? 'Front Desk';
  const toneHint =
    ctx.tone === 'formal'
      ? 'Use a professional, courteous tone.'
      : 'Use a warm, friendly tone.';

  const systemPrompt = `You are ${persona}, the front desk assistant for ${ctx.gymName}, a martial arts gym.
${toneHint}
Help visitors with class schedules, pricing, and booking free trials.
Schedule info: ${ctx.scheduleSummary ?? 'See the Schedule page on our website.'}
Pricing info: ${ctx.pricingSummary ?? 'See the Pricing page on our website.'}
Keep replies concise (2-3 sentences).
For injuries or medical questions, remind visitors to consult a doctor.`;

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ],
      max_tokens: 300,
    }),
  });

  if (!response.ok || !response.body) {
    return { message: '' };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const chunk = parsed.choices?.[0]?.delta?.content;
        if (chunk) {
          fullText += chunk;
          yield chunk;
        }
      } catch {
        // skip malformed SSE chunk
      }
    }
  }

  return { message: fullText.trim() || 'Thanks for your message!' };
}

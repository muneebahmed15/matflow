import { logger } from '@/lib/logger';
import type { BusinessMetrics, BusinessRecommendation } from '@/services/business-assistant';

export async function summarizeDigestWithLlm(input: {
  gymName: string;
  metrics: BusinessMetrics;
  recommendations: BusinessRecommendation[];
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Summarize gym business metrics in 2-3 concise sentences for the owner. No member PII. Be actionable.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              gym: input.gymName,
              metrics: {
                newLeads7d: input.metrics.newLeads7d,
                pastDueMembers: input.metrics.pastDueMembers,
                inactiveByThreshold: input.metrics.inactiveByThreshold,
                escalationQueueSize: input.metrics.escalationQueueSize,
                mrrChangePercent: input.metrics.mrrChangePercent,
              },
              topActions: input.recommendations.slice(0, 5).map((r) => r.title),
            }),
          },
        ],
        max_tokens: 200,
      }),
    });

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    logger.warn({ err }, 'Digest LLM summary failed');
    return null;
  }
}

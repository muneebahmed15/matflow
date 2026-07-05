import { describe, expect, it } from 'vitest';
import { generateLlmReply } from '@/lib/ai/llm';

describe('generateLlmReply keyword fallback', () => {
  it('responds to schedule questions without OpenAI', async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const result = await generateLlmReply(
      'When are your BJJ classes?',
      [],
      { gymName: 'Test Gym', gymSlug: 'test', scheduleSummary: 'Mon 6pm BJJ' }
    );

    expect(result.message).toContain('Mon 6pm BJJ');
    expect(result.toolCall?.name).toBe('lookup_schedule');

    if (prev) process.env.OPENAI_API_KEY = prev;
  });

  it('escalates when visitor asks for a human', async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await generateLlmReply('I need to speak to a real person', [], {
      gymName: 'Test Gym',
      gymSlug: 'test',
    });

    expect(result.toolCall?.name).toBe('escalate_to_human');
  });
});

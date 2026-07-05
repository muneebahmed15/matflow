import { describe, expect, it } from 'vitest';
import { moderateUserInput, MODERATION_BLOCK_MESSAGE } from '@/lib/ai/moderation';

describe('moderateUserInput', () => {
  it('passes through when OpenAI key is not configured', async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const result = await moderateUserInput('When are your classes?');
    expect(result.flagged).toBe(false);
    expect(result.categories).toEqual([]);

    if (prev) process.env.OPENAI_API_KEY = prev;
  });

  it('exports a user-facing block message', () => {
    expect(MODERATION_BLOCK_MESSAGE).toContain('classes');
  });
});

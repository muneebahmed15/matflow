import { describe, expect, it } from 'vitest';
import { generateMarketingCopy } from '@/lib/ai/marketing-copy';

describe('generateMarketingCopy', () => {
  it('returns template blog HTML without OpenAI key', async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const result = await generateMarketingCopy('blog_draft', {
      gymName: 'East Coast MMA',
      topic: 'beginner bjj',
    });
    process.env.OPENAI_API_KEY = prev;
    expect(result.source).toBe('template');
    expect(result.text).toContain('<h2>');
    expect(result.text).toContain('East Coast MMA');
  });

  it('returns template instagram caption without OpenAI key', async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const result = await generateMarketingCopy('instagram_caption', {
      gymName: 'East Coast MMA',
      topic: 'summer camp',
    });
    process.env.OPENAI_API_KEY = prev;
    expect(result.source).toBe('template');
    expect(result.text).toContain('#');
  });
});

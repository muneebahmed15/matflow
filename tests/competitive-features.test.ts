import { describe, it, expect } from 'vitest';
import { generateLlmReply } from '@/lib/ai/llm';

describe('generateLlmReply', () => {
  const ctx = {
    gymName: 'Test Gym',
    gymSlug: 'test-gym',
    scheduleSummary: 'BJJ Mon/Wed 6pm',
    pricingSummary: 'Plans from $99/mo',
  };

  it('responds to schedule questions', async () => {
    const result = await generateLlmReply('what is your schedule?', [], ctx);
    expect(result.message.toLowerCase()).toContain('bjj');
  });

  it('responds to trial booking intent', async () => {
    const result = await generateLlmReply('I want to book a free trial', [], ctx);
    expect(result.message.toLowerCase()).toMatch(/trial|book/);
  });

  it('captures phone numbers', async () => {
    const result = await generateLlmReply('my number is 5551234567', [], ctx);
    expect(result.toolCall?.name).toBe('capture_lead');
    expect(result.toolCall?.args.phone).toBeTruthy();
  });
});

describe('googleReviewUrl', () => {
  it('builds Google review URL from place ID', async () => {
    const { googleReviewUrl } = await import('@/services/marketing');
    const url = googleReviewUrl('ChIJtest123');
    expect(url).toContain('writereview');
    expect(url).toContain('ChIJtest123');
  });

  it('returns null without place ID', async () => {
    const { googleReviewUrl } = await import('@/services/marketing');
    expect(googleReviewUrl(null)).toBeNull();
  });
});

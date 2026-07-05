import { describe, expect, it } from 'vitest';
import { shouldSendDigest } from '@/lib/digest-schedule';

describe('shouldSendDigest', () => {
  it('sends daily at configured hour', () => {
    const monday8am = new Date('2026-07-06T12:00:00.000Z');
    expect(
      shouldSendDigest({
        timezone: 'America/New_York',
        digestHour: 8,
        digestFrequency: 'daily',
        now: monday8am,
      })
    ).toBe(true);
  });

  it('weekly only on Monday at configured hour', () => {
    const monday8am = new Date('2026-07-06T12:00:00.000Z');
    const tuesday8am = new Date('2026-07-07T12:00:00.000Z');
    expect(
      shouldSendDigest({
        timezone: 'America/New_York',
        digestHour: 8,
        digestFrequency: 'weekly',
        now: monday8am,
      })
    ).toBe(true);
    expect(
      shouldSendDigest({
        timezone: 'America/New_York',
        digestHour: 8,
        digestFrequency: 'weekly',
        now: tuesday8am,
      })
    ).toBe(false);
  });
});

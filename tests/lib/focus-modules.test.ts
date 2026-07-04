import { describe, expect, it } from 'vitest';
import { computeGbpHoursFromClasses } from '@/lib/gbp-hours';
import { smsSegmentInfo } from '@/lib/sms-segments';
import { suggestSeoKeywords } from '@/lib/seo-keywords';
import { pickHeroVariant, heroHeadline } from '@/lib/hero-ab';

describe('computeGbpHoursFromClasses', () => {
  it('merges earliest open and latest close per weekday', () => {
    const periods = computeGbpHoursFromClasses([
      { day_of_week: 'Monday', start_time: '06:00', end_time: '07:00' },
      { day_of_week: 'Monday', start_time: '18:00', end_time: '19:30' },
      { day_of_week: 'Wednesday', start_time: '12:00', end_time: '13:00' },
    ]);

    expect(periods).toHaveLength(2);
    expect(periods[0]).toMatchObject({ openDay: 'MONDAY', openTime: '06:00', closeTime: '19:30' });
    expect(periods[1]).toMatchObject({ openDay: 'WEDNESDAY', openTime: '12:00', closeTime: '13:00' });
  });
});

describe('smsSegmentInfo', () => {
  it('counts GSM-7 segments', () => {
    expect(smsSegmentInfo('Hello gym members').segments).toBe(1);
  });

  it('uses UCS-2 for emoji messages', () => {
    const info = smsSegmentInfo('Class tonight 🥋');
    expect(info.encoding).toBe('ucs2');
    expect(info.segments).toBeGreaterThanOrEqual(1);
  });
});

describe('suggestSeoKeywords', () => {
  it('includes city-based martial arts phrases', () => {
    const keywords = suggestSeoKeywords({
      gymName: 'East Coast MMA',
      city: 'Wilmington',
      state: 'NC',
      programs: ['Kids BJJ'],
    });
    expect(keywords.some((k) => k.includes('wilmington'))).toBe(true);
    expect(keywords.some((k) => k.includes('kids bjj'))).toBe(true);
  });
});

describe('hero A/B', () => {
  it('uses variant B headline when set', () => {
    expect(heroHeadline('b', 'Default Gym', 'Train Harder Today')).toBe('Train Harder Today');
  });

  it('falls back to default for variant A', () => {
    expect(heroHeadline('a', 'Default Gym', 'Train Harder Today')).toBe('Default Gym');
  });

  it('pickHeroVariant respects cookie value', () => {
    expect(pickHeroVariant('b')).toBe('b');
  });
});

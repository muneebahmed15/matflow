import { describe, expect, it } from 'vitest';
import { audienceStatusFilter, dedupeAudience, googleReviewUrl } from '@/services/marketing';
import { unsubscribeToken, verifyUnsubscribeToken, unsubscribeUrl } from '@/lib/unsubscribe';

describe('audienceStatusFilter', () => {
  it('maps member audiences to status filters', () => {
    expect(audienceStatusFilter('active_members')).toBe('active');
    expect(audienceStatusFilter('inactive_members')).toBe('inactive');
    expect(audienceStatusFilter('past_due')).toBe('past_due');
  });

  it('returns null for audiences without a status filter', () => {
    expect(audienceStatusFilter('all_members')).toBeNull();
    expect(audienceStatusFilter('leads')).toBeNull();
  });
});

describe('dedupeAudience', () => {
  it('dedupes and drops empty emails', () => {
    expect(
      dedupeAudience([
        { email: 'a@x.com' },
        { email: 'a@x.com' },
        { email: null },
        { email: 'b@x.com' },
      ])
    ).toEqual(['a@x.com', 'b@x.com']);
  });

  it('drops opted-out emails', () => {
    expect(
      dedupeAudience([
        { email: 'a@x.com', email_opt_out: true },
        { email: 'b@x.com', email_opt_out: false },
      ])
    ).toEqual(['b@x.com']);
  });
});

describe('googleReviewUrl', () => {
  it('builds a review link from a place id', () => {
    expect(googleReviewUrl('abc 123')).toBe(
      'https://search.google.com/local/writereview?placeid=abc%20123'
    );
  });

  it('returns null without a place id', () => {
    expect(googleReviewUrl(null)).toBeNull();
  });
});

describe('unsubscribe tokens', () => {
  it('verifies a valid token', () => {
    const token = unsubscribeToken('gym-1', 'a@x.com');
    expect(verifyUnsubscribeToken('gym-1', 'a@x.com', token)).toBe(true);
  });

  it('rejects tampered tokens', () => {
    const token = unsubscribeToken('gym-1', 'a@x.com');
    expect(verifyUnsubscribeToken('gym-1', 'b@x.com', token)).toBe(false);
    expect(verifyUnsubscribeToken('gym-2', 'a@x.com', token)).toBe(false);
    expect(verifyUnsubscribeToken('gym-1', 'a@x.com', 'bogus')).toBe(false);
  });

  it('builds a url containing gym, email, and token', () => {
    const url = unsubscribeUrl('https://app.example.com', 'gym-1', 'a@x.com');
    expect(url).toContain('/api/public/unsubscribe');
    expect(url).toContain('gym=gym-1');
    expect(url).toContain(encodeURIComponent('a@x.com'));
  });
});

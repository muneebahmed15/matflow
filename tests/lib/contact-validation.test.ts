import { describe, expect, it } from 'vitest';
import { isValidEmail, normalizePhone } from '@/lib/contact-validation';

describe('isValidEmail', () => {
  it('accepts normal addresses', () => {
    expect(isValidEmail('sam@example.com')).toBe(true);
    expect(isValidEmail('a.b+tag@sub.domain.co')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing@tld')).toBe(false);
    expect(isValidEmail('spaces in@example.com')).toBe(false);
  });
});

describe('normalizePhone', () => {
  it('formats 10-digit US numbers to E.164', () => {
    expect(normalizePhone('(555) 123-4567')).toBe('+15551234567');
    expect(normalizePhone('555.123.4567')).toBe('+15551234567');
  });

  it('handles 11-digit numbers with leading 1', () => {
    expect(normalizePhone('1-555-123-4567')).toBe('+15551234567');
  });

  it('keeps existing + prefixes', () => {
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
  });

  it('returns short/ambiguous input unchanged', () => {
    expect(normalizePhone('12345')).toBe('12345');
    expect(normalizePhone('')).toBe('');
  });
});

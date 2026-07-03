import { describe, expect, it } from 'vitest';
import {
  buildMemberLookup,
  resolveMemberId,
  parseImportTimestamp,
} from '@/services/migration';

describe('buildMemberLookup / resolveMemberId', () => {
  const lookup = buildMemberLookup([
    { id: 'm1', email: 'John@Example.com', external_id: 'EXT001' },
    { id: 'm2', email: null, external_id: 'EXT002' },
    { id: 'm3', email: 'jane@example.com', external_id: null },
  ]);

  it('matches by external_id first', () => {
    expect(resolveMemberId(lookup, { external_id: 'EXT001', email: 'jane@example.com' })).toBe(
      'm1'
    );
  });

  it('matches by email case-insensitively', () => {
    expect(resolveMemberId(lookup, { email: 'JOHN@example.COM' })).toBe('m1');
  });

  it('falls back to email when external_id is unknown', () => {
    expect(resolveMemberId(lookup, { external_id: 'NOPE', email: 'jane@example.com' })).toBe('m3');
  });

  it('returns null when nothing matches', () => {
    expect(resolveMemberId(lookup, { email: 'nobody@example.com' })).toBeNull();
    expect(resolveMemberId(lookup, {})).toBeNull();
  });
});

describe('parseImportTimestamp', () => {
  it('parses date-only values to noon local time ISO', () => {
    const iso = parseImportTimestamp('2024-03-15');
    expect(iso).toBeTruthy();
    expect(new Date(iso!).getFullYear()).toBe(2024);
  });

  it('parses full datetime values', () => {
    const iso = parseImportTimestamp('2024-03-15T18:30:00');
    expect(iso).toBeTruthy();
  });

  it('rejects malformed dates', () => {
    expect(parseImportTimestamp('not-a-date')).toBeNull();
    expect(parseImportTimestamp('')).toBeNull();
    expect(parseImportTimestamp(undefined)).toBeNull();
  });

  it('rejects future dates', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(parseImportTimestamp(future)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildMemberLookup,
  resolveMemberId,
  parseImportTimestamp,
  validateClassImportRow,
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

describe('validateClassImportRow', () => {
  const validRow = {
    name: 'BJJ Fundamentals',
    instructor: 'Coach John',
    day_of_week: 'monday',
    start_time: '9:00',
    end_time: '10:00',
    capacity: '20',
    category_tag: 'BJJ',
    color: '#3B82F6',
  };

  it('accepts a valid row with normalized day and times', () => {
    const result = validateClassImportRow(validRow);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parsed.dayOfWeek).toBe('Monday');
      expect(result.parsed.startTime).toBe('09:00');
      expect(result.parsed.endTime).toBe('10:00');
      expect(result.parsed.capacity).toBe(20);
    }
  });

  it('rejects missing required fields', () => {
    expect(validateClassImportRow({ ...validRow, name: '' }).ok).toBe(false);
    expect(validateClassImportRow({ ...validRow, day_of_week: 'Funday' }).ok).toBe(false);
    expect(validateClassImportRow({ ...validRow, capacity: '0' }).ok).toBe(false);
  });

  it('rejects invalid hex colors', () => {
    expect(validateClassImportRow({ ...validRow, color: 'blue' }).ok).toBe(false);
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildMemberLookup,
  resolveMemberId,
  parseImportTimestamp,
  validateClassImportRow,
  importMembersFromRows,
} from '@/services/migration';
import { parseCsv, csvRowsToObjects } from '@/lib/csv';
import { guessColumnMap, IMPORT_TARGET_FIELDS } from '@/lib/import-maps';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

vi.mock('@/services/members', () => ({
  createMember: vi.fn(async () => ({ id: 'new-member' })),
  updateMember: vi.fn(async () => ({ id: 'updated' })),
}));

vi.mock('@/services/audit', () => ({
  logAuditEvent: vi.fn(async () => undefined),
}));

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'order', 'insert', 'update', 'not', 'ilike']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  builder.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(resolve({ error: result.error ?? null, data: result.data ?? null }));
  return builder;
}

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

describe('member import dry-run', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockFrom.mockReturnValue(
      chain({
        data: { id: 'job-1' },
      })
    );
  });

  it('validates fixture CSV through column mapping without committing members', async () => {
    const fixturePath = join(process.cwd(), 'tests/fixtures/members-import.csv');
    const text = readFileSync(fixturePath, 'utf8');
    const rows = parseCsv(text);
    const headers = rows[0].map((h) => h.trim());
    const mapping = guessColumnMap(headers, IMPORT_TARGET_FIELDS.members);
    const { objects } = csvRowsToObjects(rows, mapping);

    const result = await importMembersFromRows(
      'gym-1',
      objects as { first_name: string; last_name: string; email?: string }[],
      { dryRun: true, fileName: 'members-import.csv' }
    );

    expect(result.success).toBe(2);
    expect(result.errors).toHaveLength(0);
  });
});

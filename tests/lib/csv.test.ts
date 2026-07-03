import { describe, expect, it } from 'vitest';
import { parseCsv, csvRowsToObjects, MEMBER_IMPORT_TEMPLATE } from '@/lib/csv';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    const rows = parseCsv('a,b,c\n1,2,3');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields with commas', () => {
    const rows = parseCsv('name,note\n"Smith, Jr","hello, world"');
    expect(rows[1]).toEqual(['Smith, Jr', 'hello, world']);
  });
});

describe('csvRowsToObjects', () => {
  it('maps header row to objects', () => {
    const rows = parseCsv('first_name,last_name,email\nJane,Doe,jane@example.com');
    const { objects } = csvRowsToObjects(rows, {
      first_name: 'first_name',
      last_name: 'last_name',
      email: 'email',
    });
    expect(objects).toEqual([{ first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' }]);
  });
});

describe('MEMBER_IMPORT_TEMPLATE', () => {
  it('includes required headers', () => {
    expect(MEMBER_IMPORT_TEMPLATE).toContain('first_name');
    expect(MEMBER_IMPORT_TEMPLATE).toContain('last_name');
  });
});

describe('stringifyCsv', () => {
  it('escapes commas and quotes', async () => {
    const { stringifyCsv } = await import('@/lib/csv');
    const csv = stringifyCsv(['name', 'note'], [['Smith, Jr', 'said "hi"']]);
    expect(csv).toContain('"Smith, Jr"');
    expect(csv).toContain('"said ""hi"""');
  });
});

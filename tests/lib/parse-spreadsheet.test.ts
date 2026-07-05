import { describe, expect, it } from 'vitest';
import {
  parseCsvSpreadsheet,
  detectSpreadsheetFormat,
} from '@/lib/parse-spreadsheet';

describe('parse-spreadsheet', () => {
  it('parses CSV text into headers and rows', () => {
    const result = parseCsvSpreadsheet('first_name,email\nJane,jane@example.com');
    expect(result.headers).toEqual(['first_name', 'email']);
    expect(result.rows.length).toBe(2);
  });

  it('detects xlsx by extension', () => {
    expect(detectSpreadsheetFormat('members.xlsx')).toBe('xlsx');
    expect(detectSpreadsheetFormat('members.csv')).toBe('csv');
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildGoogleSheetsCsvExportUrl,
  parseGoogleSheetsUrl,
} from '@/lib/google-sheets-import';

describe('parseGoogleSheetsUrl', () => {
  it('extracts spreadsheet id and gid from edit URL', () => {
    const ref = parseGoogleSheetsUrl(
      'https://docs.google.com/spreadsheets/d/abc123XYZ/edit#gid=456789'
    );
    expect(ref).toEqual({ spreadsheetId: 'abc123XYZ', gid: '456789' });
  });

  it('defaults gid to 0 when missing', () => {
    const ref = parseGoogleSheetsUrl(
      'https://docs.google.com/spreadsheets/d/abc123XYZ/edit?usp=sharing'
    );
    expect(ref.gid).toBe('0');
  });

  it('reads gid from query string', () => {
    const ref = parseGoogleSheetsUrl(
      'https://docs.google.com/spreadsheets/d/abc123XYZ/edit?gid=99'
    );
    expect(ref.gid).toBe('99');
  });

  it('rejects non-Google URLs', () => {
    expect(() => parseGoogleSheetsUrl('https://example.com/sheet.csv')).toThrow(
      /Google Sheets link/
    );
  });
});

describe('buildGoogleSheetsCsvExportUrl', () => {
  it('builds CSV export URL', () => {
    const url = buildGoogleSheetsCsvExportUrl({ spreadsheetId: 'abc123', gid: '0' });
    expect(url).toBe(
      'https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=0'
    );
  });
});

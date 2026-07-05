import * as XLSX from 'xlsx';

export type SpreadsheetParseResult = {
  headers: string[];
  rows: string[][];
};

/** Parse CSV text into header + data rows (first row = headers). */
export function parseCsvSpreadsheet(text: string): SpreadsheetParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const rows = lines.map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    cells.push(current.trim());
    return cells;
  });
  const headers = rows[0].map((h) => h.trim()).filter(Boolean);
  return { headers, rows };
}

/** Parse .xlsx buffer server-side into header + data rows. */
export function parseXlsxSpreadsheet(buffer: ArrayBuffer | Uint8Array): SpreadsheetParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (!raw.length) return { headers: [], rows: [] };

  const stringify = (v: unknown): string => {
    if (v instanceof Date) return v.toISOString();
    if (v === null || v === undefined) return '';
    return String(v).trim();
  };

  const rows = raw.map((row) => (Array.isArray(row) ? row.map(stringify) : []));
  const headers = rows[0].map((h) => h.trim()).filter(Boolean);
  return { headers, rows };
}

export function detectSpreadsheetFormat(fileName: string, mimeType?: string): 'csv' | 'xlsx' {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.xlsx') || mimeType?.includes('spreadsheetml')) return 'xlsx';
  return 'csv';
}

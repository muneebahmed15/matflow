/**
 * Parse CSV text into rows. Handles quoted fields with commas.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
      row.push(field.trim());
      field = '';
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      if (ch === '\r') i++;
    } else if (ch !== '\r') {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((c) => c.length > 0)) rows.push(row);
  }

  return rows;
}

export function csvRowsToObjects(
  rows: string[][],
  columnMap: Record<string, string>
): { objects: Record<string, string>[]; headers: string[] } {
  if (rows.length < 2) return { objects: [], headers: [] };

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const objects: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some((c) => c.trim())) continue;

    const obj: Record<string, string> = {};
    for (const [target, source] of Object.entries(columnMap)) {
      const idx = headers.indexOf(source.toLowerCase());
      if (idx >= 0 && row[idx]) obj[target] = row[idx].trim();
    }
    objects.push(obj);
  }

  return { objects, headers };
}

export const MEMBER_IMPORT_TEMPLATE = `first_name,last_name,email,phone,belt_rank,status,external_id
John,Doe,john@example.com,555-0100,white,active,EXT001`;

export const LEAD_IMPORT_TEMPLATE = `first_name,last_name,email,phone,source,notes
Jane,Doe,jane@example.com,555-0100,referral,Interested in BJJ`;

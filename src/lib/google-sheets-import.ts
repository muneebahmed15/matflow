const GOOGLE_SHEETS_HOST = 'docs.google.com';
const MAX_SHEET_BYTES = 5 * 1024 * 1024;

export type GoogleSheetReference = {
  spreadsheetId: string;
  gid: string;
};

export function parseGoogleSheetsUrl(input: string): GoogleSheetReference {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('Invalid Google Sheets URL');
  }

  if (url.hostname !== GOOGLE_SHEETS_HOST) {
    throw new Error('URL must be a Google Sheets link (docs.google.com/spreadsheets/...)');
  }

  const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match?.[1]) {
    throw new Error('Could not find spreadsheet ID in URL');
  }

  const gidFromHash = url.hash.match(/gid=(\d+)/)?.[1];
  const gidFromQuery = url.searchParams.get('gid');
  const gid = gidFromHash ?? gidFromQuery ?? '0';

  return { spreadsheetId: match[1], gid };
}

export function buildGoogleSheetsCsvExportUrl(ref: GoogleSheetReference): string {
  const params = new URLSearchParams({ format: 'csv', gid: ref.gid });
  return `https://${GOOGLE_SHEETS_HOST}/spreadsheets/d/${ref.spreadsheetId}/export?${params.toString()}`;
}

export async function fetchGoogleSheetCsv(sheetUrl: string): Promise<{
  csvText: string;
  exportUrl: string;
  spreadsheetId: string;
}> {
  const ref = parseGoogleSheetsUrl(sheetUrl);
  const exportUrl = buildGoogleSheetsCsvExportUrl(ref);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(exportUrl, {
      signal: controller.signal,
      headers: { Accept: 'text/csv,text/plain,*/*' },
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        throw new Error(
          'Google Sheet is not publicly accessible. Share it as “Anyone with the link can view”, or use CSV upload.'
        );
      }
      throw new Error(`Failed to fetch sheet (HTTP ${response.status})`);
    }

    const finalUrl = response.url;
    if (!finalUrl.includes(GOOGLE_SHEETS_HOST)) {
      throw new Error('Unexpected redirect when fetching Google Sheet');
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_SHEET_BYTES) {
      throw new Error('Google Sheet export exceeds 5 MB limit');
    }

    const csvText = new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '');
    if (!csvText.trim()) {
      throw new Error('Google Sheet export was empty');
    }

    if (csvText.trimStart().startsWith('<!DOCTYPE html') || csvText.includes('<html')) {
      throw new Error(
        'Could not read sheet as CSV. Ensure the sheet is shared publicly or use file upload.'
      );
    }

    return { csvText, exportUrl, spreadsheetId: ref.spreadsheetId };
  } finally {
    clearTimeout(timeout);
  }
}

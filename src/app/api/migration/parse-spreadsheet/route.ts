import { NextRequest, NextResponse } from 'next/server';
import { isErrorResponse, requireStaffAuth } from '@/lib/auth/api';
import {
  detectSpreadsheetFormat,
  parseXlsxSpreadsheet,
  parseCsvSpreadsheet,
} from '@/lib/parse-spreadsheet';
import { validateSpreadsheetUpload } from '@/lib/upload-validation';
import { handleRouteError } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const uploadError = validateSpreadsheetUpload(file);
    if (uploadError) {
      return NextResponse.json({ error: uploadError }, { status: 400 });
    }

    const format = detectSpreadsheetFormat(file.name, file.type);
    let headers: string[];
    let rows: string[][];

    if (format === 'xlsx') {
      const buffer = await file.arrayBuffer();
      const parsed = parseXlsxSpreadsheet(buffer);
      headers = parsed.headers;
      rows = parsed.rows;
    } else {
      const text = await file.text();
      const parsed = parseCsvSpreadsheet(text);
      headers = parsed.headers;
      rows = parsed.rows;
    }

    if (headers.length === 0 || rows.length < 2) {
      return NextResponse.json(
        { error: 'Spreadsheet must include a header row and at least one data row.' },
        { status: 400 }
      );
    }

    const csvText =
      format === 'csv'
        ? await file.text()
        : [headers.join(','), ...rows.slice(1).map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');

    return NextResponse.json({
      headers,
      rowCount: rows.length - 1,
      preview: rows.slice(1, 11).map((cells) =>
        Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))
      ),
      csvText,
    });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Failed to parse spreadsheet',
      logMessage: 'parse-spreadsheet failed',
    });
  }
}

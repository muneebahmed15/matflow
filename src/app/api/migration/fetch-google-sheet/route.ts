import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isErrorResponse, requireStaffAuth } from '@/lib/auth/api';
import { parseJsonBody } from '@/lib/api-validate';
import { handleRouteError } from '@/lib/api-error';
import { fetchGoogleSheetCsv } from '@/lib/google-sheets-import';
import { parseCsvSpreadsheet } from '@/lib/parse-spreadsheet';

const schema = z.object({
  url: z.string().url().max(2000),
});

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  const parsed = await parseJsonBody(req, schema);
  if (!parsed.success) return parsed.response;

  try {
    const { csvText, spreadsheetId } = await fetchGoogleSheetCsv(parsed.data.url);
    const { headers, rows } = parseCsvSpreadsheet(csvText);

    if (headers.length === 0 || rows.length < 2) {
      return NextResponse.json(
        { error: 'Sheet must include a header row and at least one data row.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      headers,
      rowCount: rows.length - 1,
      csvText,
      fileName: `google-sheet-${spreadsheetId.slice(0, 8)}.csv`,
      preview: rows.slice(1, 11).map((cells) =>
        Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))
      ),
    });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Failed to import Google Sheet',
      logMessage: 'fetch-google-sheet failed',
      logContext: { gymId: auth.gymId },
    });
  }
}

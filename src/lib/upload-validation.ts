export const MAX_SPREADSHEET_BYTES = 10 * 1024 * 1024;
export const MAX_ZIP_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_BYTES = 15 * 1024 * 1024;

export function validateSpreadsheetUpload(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
    return 'Only .csv and .xlsx files are allowed';
  }
  if (file.size > MAX_SPREADSHEET_BYTES) {
    return 'Spreadsheet must be 10 MB or smaller';
  }
  return null;
}

export function validatePdfUpload(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return 'Only PDF files are allowed';
  }
  if (file.size > MAX_PDF_BYTES) {
    return 'Each PDF must be 15 MB or smaller';
  }
  return null;
}

export function validateZipUpload(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return 'Only .zip files are allowed';
  }
  if (file.size > MAX_ZIP_BYTES) {
    return 'Zip archive must be 50 MB or smaller';
  }
  return null;
}

/** Basic magic-byte check for PDF uploads (lightweight substitute for virus scan). */
export async function assertPdfMagicBytes(file: File): Promise<string | null> {
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const magic = '%PDF-';
  for (let i = 0; i < magic.length; i++) {
    if (header[i] !== magic.charCodeAt(i)) {
      return 'File does not appear to be a valid PDF';
    }
  }
  return null;
}

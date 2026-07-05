import { describe, expect, it } from 'vitest';
import {
  validatePdfUpload,
  validateSpreadsheetUpload,
  validateZipUpload,
} from '@/lib/upload-validation';

describe('upload validation', () => {
  it('accepts csv and xlsx within size limit', () => {
    expect(
      validateSpreadsheetUpload({ name: 'members.csv', size: 1024 } as File)
    ).toBeNull();
    expect(
      validateSpreadsheetUpload({ name: 'members.xlsx', size: 1024 } as File)
    ).toBeNull();
  });

  it('rejects unsupported spreadsheet types', () => {
    expect(
      validateSpreadsheetUpload({ name: 'members.xls', size: 1024 } as File)
    ).toMatch(/Only .csv and .xlsx/);
  });

  it('validates pdf and zip uploads', () => {
    expect(validatePdfUpload({ name: 'waiver.pdf', size: 1024 } as File)).toBeNull();
    expect(validateZipUpload({ name: 'photos.zip', size: 1024 } as File)).toBeNull();
    expect(validatePdfUpload({ name: 'waiver.exe', size: 1024 } as File)).toMatch(/PDF/);
  });
});

import { describe, expect, it } from 'vitest';
import {
  memberImportRowSchema,
  validateImportRow,
  validateImportRows,
} from '@/lib/import-schemas';

describe('memberImportRowSchema', () => {
  it('accepts valid rows', () => {
    const result = validateImportRow(memberImportRowSchema, {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
    }, 2);
    expect(result.ok).toBe(true);
  });

  it('rejects missing names', () => {
    const result = validateImportRow(memberImportRowSchema, {
      first_name: '',
      last_name: 'Doe',
    }, 2);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('first_name');
  });
});

describe('validateImportRows', () => {
  it('returns valid rows and row-numbered errors', () => {
    const { rows, errors } = validateImportRows(memberImportRowSchema, [
      { first_name: 'A', last_name: 'B' },
      { first_name: '', last_name: 'C' },
    ]);
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(3);
  });
});

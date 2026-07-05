import { describe, expect, it } from 'vitest';
import { guessColumnMap, IMPORT_TARGET_FIELDS } from '@/lib/import-maps';

describe('guessColumnMap', () => {
  it('maps common header aliases to member fields', () => {
    const mapping = guessColumnMap(
      ['First Name', 'Last Name', 'E-mail', 'Mobile', 'Belt', 'Member Status', 'Legacy ID'],
      IMPORT_TARGET_FIELDS.members
    );
    expect(mapping.first_name).toBe('First Name');
    expect(mapping.last_name).toBe('Last Name');
    expect(mapping.email).toBe('E-mail');
    expect(mapping.phone).toBe('Mobile');
    expect(mapping.belt_rank).toBe('Belt');
    expect(mapping.external_id).toBe('Legacy ID');
  });

  it('leaves unmapped fields out of the result', () => {
    const mapping = guessColumnMap(['email'], IMPORT_TARGET_FIELDS.members);
    expect(mapping.email).toBe('email');
    expect(mapping.first_name).toBeUndefined();
  });
});

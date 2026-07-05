export type ImportType = 'members' | 'leads' | 'attendance' | 'belt_history' | 'classes';

export const IMPORT_TARGET_FIELDS: Record<ImportType, string[]> = {
  members: ['first_name', 'last_name', 'email', 'phone', 'belt_rank', 'status', 'external_id'],
  leads: ['first_name', 'last_name', 'email', 'phone', 'source', 'notes'],
  attendance: ['email', 'external_id', 'checked_in_at', 'notes'],
  belt_history: ['email', 'external_id', 'from_belt', 'to_belt', 'promoted_at', 'notes'],
  classes: [
    'name',
    'instructor',
    'day_of_week',
    'start_time',
    'end_time',
    'capacity',
    'category_tag',
    'color',
    'description',
  ],
};

const FIELD_ALIASES: Record<string, string[]> = {
  first_name: ['first name', 'firstname', 'first_name', 'fname', 'given name'],
  last_name: ['last name', 'lastname', 'last_name', 'lname', 'surname', 'family name'],
  email: ['email', 'e-mail', 'email address', 'member email'],
  phone: ['phone', 'mobile', 'cell', 'telephone', 'phone number'],
  belt_rank: ['belt', 'belt_rank', 'rank', 'belt rank', 'current belt'],
  status: ['status', 'member status', 'active'],
  external_id: ['external_id', 'external id', 'legacy id', 'member id', 'id'],
  source: ['source', 'lead source', 'referral source'],
  notes: ['notes', 'note', 'comments', 'comment'],
  checked_in_at: ['checked_in_at', 'check in', 'check-in', 'date', 'attendance date', 'checked in'],
  from_belt: ['from_belt', 'from belt', 'previous belt'],
  to_belt: ['to_belt', 'to belt', 'new belt', 'promoted to'],
  promoted_at: ['promoted_at', 'promotion date', 'promoted date', 'date promoted'],
  name: ['name', 'class name', 'class'],
  instructor: ['instructor', 'coach', 'teacher'],
  day_of_week: ['day_of_week', 'day', 'day of week', 'weekday'],
  start_time: ['start_time', 'start', 'start time', 'begins'],
  end_time: ['end_time', 'end', 'end time', 'ends'],
  capacity: ['capacity', 'max', 'max students', 'spots'],
  category_tag: ['category_tag', 'category', 'tag', 'discipline'],
  color: ['color', 'colour', 'hex'],
  description: ['description', 'desc', 'details'],
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[_\s]+/g, ' ');
}

export function guessColumnMap(csvHeaders: string[], targetFields: string[]): Record<string, string> {
  const normalizedHeaders = csvHeaders.map((h) => h.trim());
  const mapping: Record<string, string> = {};

  for (const field of targetFields) {
    const aliases = [field, ...(FIELD_ALIASES[field] ?? [])].map(normalizeHeader);
    const match = normalizedHeaders.find((header) =>
      aliases.includes(normalizeHeader(header))
    );
    if (match) mapping[field] = match;
  }

  return mapping;
}

export function defaultColumnMap(importType: ImportType): Record<string, string> {
  const fields = IMPORT_TARGET_FIELDS[importType];
  return Object.fromEntries(fields.map((field) => [field, field]));
}

export function resolveColumnMap(
  importType: ImportType,
  csvHeaders: string[],
  userMapping?: Record<string, string>
): Record<string, string> {
  if (userMapping && Object.keys(userMapping).length > 0) {
    return userMapping;
  }
  const guessed = guessColumnMap(csvHeaders, IMPORT_TARGET_FIELDS[importType]);
  if (Object.keys(guessed).length > 0) return guessed;
  return defaultColumnMap(importType);
}

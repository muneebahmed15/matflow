import { z } from 'zod';

const optionalString = z.string().trim().optional().or(z.literal(''));

export const memberImportRowSchema = z.object({
  first_name: z.string().trim().min(1, 'first_name is required'),
  last_name: z.string().trim().min(1, 'last_name is required'),
  email: optionalString,
  phone: optionalString,
  belt_rank: optionalString,
  status: optionalString,
  external_id: optionalString,
  stripe_customer_id: optionalString,
});

export const leadImportRowSchema = z.object({
  first_name: z.string().trim().min(1, 'first_name is required'),
  last_name: z.string().trim().min(1, 'last_name is required'),
  email: optionalString,
  phone: optionalString,
  source: optionalString,
  notes: optionalString,
});

export const attendanceImportRowSchema = z.object({
  email: optionalString,
  external_id: optionalString,
  checked_in_at: z.string().trim().min(1, 'checked_in_at is required'),
  notes: optionalString,
});

export const beltHistoryImportRowSchema = z.object({
  email: optionalString,
  external_id: optionalString,
  from_belt: optionalString,
  to_belt: z.string().trim().min(1, 'to_belt is required'),
  promoted_at: z.string().trim().min(1, 'promoted_at is required'),
  notes: optionalString,
});

export const classImportRowSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  instructor: z.string().trim().min(1, 'instructor is required'),
  day_of_week: z.string().trim().min(1, 'day_of_week is required'),
  start_time: z.string().trim().min(1, 'start_time is required'),
  end_time: z.string().trim().min(1, 'end_time is required'),
  capacity: z.union([z.string(), z.number()]),
  category_tag: optionalString,
  color: optionalString,
  description: optionalString,
});

export const stripeCustomerMappingRowSchema = z.object({
  email: z.string().trim().min(1, 'email is required'),
  stripe_customer_id: z.string().trim().min(1, 'stripe_customer_id is required'),
});

export type ValidatedStripeCustomerMappingRow = z.infer<typeof stripeCustomerMappingRowSchema>;
export type ValidatedLeadImportRow = z.infer<typeof leadImportRowSchema>;

export function validateImportRow<T>(
  schema: z.ZodType<T>,
  row: unknown,
  rowNum: number
): { ok: true; data: T } | { ok: false; row: number; message: string } {
  const result = schema.safeParse(row);
  if (result.success) return { ok: true, data: result.data };
  const message = result.error.issues.map((i) => i.message).join('; ');
  return { ok: false, row: rowNum, message };
}

export function validateImportRows<T>(
  schema: z.ZodType<T>,
  rows: unknown[],
  startIndex = 0
): { rows: T[]; errors: { row: number; message: string }[] } {
  const valid: T[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = startIndex + i + 2;
    const result = validateImportRow(schema, rows[i], rowNum);
    if (result.ok) valid.push(result.data);
    else errors.push({ row: result.row, message: result.message });
  }

  return { rows: valid, errors };
}

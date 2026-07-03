import { isServiceError } from '@/services/errors';

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export function toActionError<T = void>(error: unknown): ActionResult<T> {
  if (isServiceError(error)) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: 'Something went wrong' };
}

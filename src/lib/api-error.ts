import { NextResponse } from 'next/server';
import { isServiceError } from '@/services/errors';
import { logger } from '@/lib/logger';

/**
 * Standard API route catch-block handler: logs with context, maps
 * ServiceError to its status code, and falls back to 500 otherwise.
 */
export function handleRouteError(
  err: unknown,
  options: {
    fallbackMessage: string;
    logMessage: string;
    logContext?: Record<string, unknown>;
  }
): NextResponse {
  const message = err instanceof Error ? err.message : options.fallbackMessage;
  logger.error({ err, ...options.logContext }, options.logMessage);

  if (isServiceError(err)) {
    return NextResponse.json({ error: message }, { status: err.status });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

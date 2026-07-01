import { describe, expect, it, vi, beforeEach } from 'vitest';

const { error: loggerError } = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: loggerError } }));

import { handleRouteError } from '@/lib/api-error';
import { ServiceError } from '@/services/errors';

describe('handleRouteError', () => {
  beforeEach(() => loggerError.mockReset());

  it('maps a ServiceError to its own status code and message', async () => {
    const res = handleRouteError(new ServiceError(404, 'Not found'), {
      fallbackMessage: 'fallback',
      logMessage: 'op failed',
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
    expect(loggerError).toHaveBeenCalledWith(expect.objectContaining({}), 'op failed');
  });

  it('falls back to 500 for a plain Error', async () => {
    const res = handleRouteError(new Error('boom'), {
      fallbackMessage: 'fallback',
      logMessage: 'op failed',
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'boom' });
  });

  it('uses the fallback message when the thrown value is not an Error', async () => {
    const res = handleRouteError('not an error', {
      fallbackMessage: 'fallback message',
      logMessage: 'op failed',
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'fallback message' });
  });

  it('includes the provided log context', () => {
    handleRouteError(new Error('boom'), {
      fallbackMessage: 'fallback',
      logMessage: 'op failed',
      logContext: { gymId: 'gym-1' },
    });

    expect(loggerError).toHaveBeenCalledWith(
      expect.objectContaining({ gymId: 'gym-1' }),
      'op failed'
    );
  });
});

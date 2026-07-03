export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return;
  if (process.env.CI === 'true') return;

  const { validateRuntimeEnv } = await import('@/lib/env');
  const result = validateRuntimeEnv();
  if (!result.ok) {
    throw new Error(`MatsFlow startup failed: ${result.message}`);
  }
}

import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}

/** Validated public env vars (safe for browser bundling). */
export function getPublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    throw new Error(`Invalid public environment: ${formatZodError(parsed.error)}`);
  }

  return parsed.data;
}

/** Validated server-only env vars. Never import from client components. */
export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  });

  if (!parsed.success) {
    throw new Error(`Invalid server environment: ${formatZodError(parsed.error)}`);
  }

  return parsed.data;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Returns true when all required env vars are present (for build/startup checks). */
export function validateRuntimeEnv(): { ok: true } | { ok: false; message: string } {
  try {
    getPublicEnv();
    getServerEnv();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown env validation error';
    return { ok: false, message };
  }
}

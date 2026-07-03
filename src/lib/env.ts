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
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(1).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export type EmailEnv = {
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
};

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
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  });

  if (!parsed.success) {
    throw new Error(`Invalid server environment: ${formatZodError(parsed.error)}`);
  }

  return parsed.data;
}

/** Resend config when both vars are set; otherwise transactional email is dev-log only. */
export function getEmailEnv(): EmailEnv | null {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL } = getServerEnv();
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) return null;
  return { RESEND_API_KEY, RESEND_FROM_EMAIL };
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Returns true when all required env vars are present (for build/startup checks). */
export function validateRuntimeEnv(): { ok: true } | { ok: false; message: string } {
  try {
    getPublicEnv();
    const server = getServerEnv();

    if (isProduction()) {
      const missing: string[] = [];
      if (!server.RESEND_API_KEY) missing.push('RESEND_API_KEY');
      if (!server.RESEND_FROM_EMAIL) missing.push('RESEND_FROM_EMAIL');
      if (!process.env.CRON_SECRET) missing.push('CRON_SECRET');
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        missing.push('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
      }
      if (missing.length > 0) {
        return {
          ok: false,
          message: `Missing production environment: ${missing.join(', ')}`,
        };
      }
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown env validation error';
    return { ok: false, message };
  }
}

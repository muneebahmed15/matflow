import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPublicEnv, isProduction } from '@/lib/env';
import {
  isPlaceholderSupabaseUrl,
  LOCAL_SUPABASE_ANON_KEY,
  LOCAL_SUPABASE_URL,
} from '@/lib/supabase/local';

export function createClient() {
  if (isProduction()) {
    const env = getPublicEnv();
    return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  const url = isPlaceholderSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    ? LOCAL_SUPABASE_URL
    : (process.env.NEXT_PUBLIC_SUPABASE_URL ?? LOCAL_SUPABASE_URL);
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'your-anon-key' ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? LOCAL_SUPABASE_ANON_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createBrowserClient(url, key);
}

let browserClient: SupabaseClient | null = null;

/** Singleton browser Supabase client (cookie-backed session via @supabase/ssr). */
export function getSupabase(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabase(), prop, receiver);
  },
});

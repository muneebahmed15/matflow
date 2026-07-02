import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getPublicEnv, getServerEnv } from '@/lib/env';
import {
  isPlaceholderSupabaseUrl,
  LOCAL_SUPABASE_SERVICE_ROLE_KEY,
  LOCAL_SUPABASE_URL,
} from '@/lib/supabase/local';

let adminClient: SupabaseClient | null = null;

function resolveSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (process.env.NODE_ENV === 'production') {
    return getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  }
  return isPlaceholderSupabaseUrl(url) ? LOCAL_SUPABASE_URL : (url ?? LOCAL_SUPABASE_URL);
}

function resolveServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.NODE_ENV === 'production') {
    return getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  }
  return key === 'your-service-role-key' || !key ? LOCAL_SUPABASE_SERVICE_ROLE_KEY : key;
}

/** Service-role client — bypasses RLS. Use only in trusted server contexts. */
export function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(resolveSupabaseUrl(), resolveServiceRoleKey());
  }
  return adminClient;
}

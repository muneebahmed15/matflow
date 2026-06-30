import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getPublicEnv, getServerEnv } from '@/lib/env';

let adminClient: SupabaseClient | null = null;

/** Service-role client — bypasses RLS. Use only in trusted server contexts. */
export function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
    const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
    adminClient = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return adminClient;
}

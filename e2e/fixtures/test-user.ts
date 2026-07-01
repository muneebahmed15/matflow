import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for e2e fixture setup'
    );
  }
  return createClient(url, serviceKey);
}

/** Creates a pre-confirmed staff user for E2E tests, bypassing the email-confirmation step. */
export async function createConfirmedStaffUser(email: string, password: string) {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: 'E2E', last_name: 'Test' },
  });
  if (error || !data.user) {
    throw new Error(`Failed to create e2e test user: ${error?.message}`);
  }
  return data.user;
}

/** Best-effort cleanup: deletes the auth user (gym/staff rows cascade via FK on delete). */
export async function deleteTestUser(userId: string): Promise<void> {
  const admin = adminClient();
  await admin.auth.admin.deleteUser(userId);
}

// Supabase Auth rejects common placeholder domains (example.com/example.org/test.com) as
// invalid at signup time, so this uses a real-looking domain purely for format validation --
// these addresses are never sent to and the accounts are cleaned up in test teardown.
export function uniqueTestEmail(prefix: string): string {
  return `${prefix}+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@gmail.com`;
}

/** Best-effort cleanup for users created through the UI signup form (no id returned to the test). */
export async function deleteTestUserByEmail(email: string): Promise<void> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) return;
  const match = data.users.find((u) => u.email === email);
  if (match) await admin.auth.admin.deleteUser(match.id);
}

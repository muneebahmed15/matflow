import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateRuntimeEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envCheck = validateRuntimeEnv();
  if (!envCheck.ok) {
    return NextResponse.json(
      { status: 'error', checks: { env: envCheck.message } },
      { status: 503 }
    );
  }

  try {
    const admin = getAdminClient();
    const { error } = await admin.from('gyms').select('id').limit(1);
    if (error) throw error;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database check failed';
    return NextResponse.json(
      { status: 'error', checks: { database: message } },
      { status: 503 }
    );
  }

  return NextResponse.json({ status: 'ok', checks: { env: 'ok', database: 'ok' } });
}
